package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	sysruntime "runtime"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"axiom/internal/engine"
	"axiom/internal/job"
	"axiom/internal/proxy"
)

type App struct {
	ctx             context.Context
	engine          *engine.Engine
	startupFilePath string
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.engine = engine.NewEngine(ctx, func(event string, data ...interface{}) {
		runtime.EventsEmit(ctx, event, data...)
	})
}

func (a *App) GetStartupFile() string {
	p := a.startupFilePath
	a.startupFilePath = ""
	return p
}


func (a *App) CreateJob(configJSON string, targets []string, proxyLines []string) (string, error) {
	return a.engine.CreateJob(configJSON, targets, proxyLines)
}

func (a *App) LoadTargets(filePath string) ([]string, error) {
	return readLines(filePath)
}

func (a *App) LoadProxies(filePath string) ([]string, error) {
	return readLines(filePath)
}

func (a *App) StartJob(jobID string) error  { return a.engine.StartJob(jobID) }
func (a *App) PauseJob(jobID string) error  { return a.engine.PauseJob(jobID) }
func (a *App) ResumeJob(jobID string) error { return a.engine.ResumeJob(jobID) }
func (a *App) StopJob(jobID string) error   { return a.engine.StopJob(jobID) }

func (a *App) GetJobStatus(jobID string) (*job.StatusSnapshot, error) {
	return a.engine.GetJobStatus(jobID)
}

func (a *App) ListJobs() []*job.StatusSnapshot {
	return a.engine.ListJobs()
}

func (a *App) GetResults(jobID, bucket string, offset, limit int) ([]job.Result, error) {
	return a.engine.GetResults(jobID, bucket, offset, limit)
}

func (a *App) GetProxyStats(jobID string) ([]proxy.ProxyStat, error) {
	return a.engine.GetProxyStats(jobID)
}

func (a *App) GetJobTargets(jobID string) ([]string, error) {
	return a.engine.GetJobTargets(jobID)
}

func (a *App) UpdateJobTargets(jobID string, targets []string) error {
	return a.engine.UpdateJobTargets(jobID, targets)
}

func (a *App) GetJobProxies(jobID string) ([]string, error) {
	return a.engine.GetJobProxies(jobID)
}

func (a *App) UpdateJobProxies(jobID string, proxyLines []string) error {
	return a.engine.UpdateJobProxies(jobID, proxyLines)
}


func (a *App) OpenFileDialog(title, filter string) (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: title,
		Filters: []runtime.FileFilter{
			{DisplayName: filter, Pattern: "*.*"},
		},
	})
}

func (a *App) OpenAxprojDialog() (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Open Preset",
		Filters: []runtime.FileFilter{
			{DisplayName: "Axiom Preset (*.axproj)", Pattern: "*.axproj"},
		},
	})
}

func (a *App) SaveAxprojDialog(defaultName string) (string, error) {
	return runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Preset",
		DefaultFilename: defaultName + ".axproj",
		Filters: []runtime.FileFilter{
			{DisplayName: "Axiom Preset (*.axproj)", Pattern: "*.axproj"},
		},
	})
}

func (a *App) ReadTextFile(path string) (string, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (a *App) WriteTextFile(path, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}

func (a *App) GetAppVersion() string {
	return Version
}

func (a *App) GetOS() string {
	return sysruntime.GOOS
}

func (a *App) PerformUpdate(downloadURL string) error {
	resp, err := http.Get(downloadURL) // #nosec G107
	if err != nil {
		return fmt.Errorf("download: %w", err)
	}
	defer resp.Body.Close()

	parts := strings.Split(downloadURL, "/")
	fileName := parts[len(parts)-1]
	tmpFile := filepath.Join(os.TempDir(), fileName)

	f, err := os.Create(tmpFile)
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	_, err = io.Copy(f, resp.Body)
	f.Close()
	if err != nil {
		return fmt.Errorf("write temp file: %w", err)
	}

	switch sysruntime.GOOS {
	case "windows":
		return a.performUpdateWindows(tmpFile)
	case "darwin":
		return a.performUpdateDarwin(tmpFile)
	default:
		runtime.BrowserOpenURL(a.ctx, downloadURL)
		return nil
	}
}

func (a *App) performUpdateWindows(installerPath string) error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}
	newAppPath := filepath.Join(filepath.Dir(exePath), "Axiom.exe")

	script := fmt.Sprintf(`$proc = Get-Process -Id %d -ErrorAction SilentlyContinue
if ($proc) { $proc.WaitForExit(15000) }
Start-Process -FilePath '%s' -ArgumentList '/S' -Wait
if (Test-Path '%s') { Start-Process '%s' }
`, os.Getpid(), installerPath, newAppPath, newAppPath)

	scriptPath := filepath.Join(os.TempDir(), "axiom-update.ps1")
	if err := os.WriteFile(scriptPath, []byte(script), 0644); err != nil {
		return err
	}

	cmd := exec.Command("powershell", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", scriptPath) // #nosec G204
	if err := cmd.Start(); err != nil {
		return err
	}

	go func() {
		time.Sleep(100 * time.Millisecond)
		runtime.Quit(a.ctx)
	}()
	return nil
}

func (a *App) performUpdateDarwin(dmgPath string) error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}
	appPath := filepath.Dir(filepath.Dir(filepath.Dir(exePath)))
	appDir := filepath.Dir(appPath)

	out, err := exec.Command("hdiutil", "attach", "-nobrowse", "-quiet", dmgPath).Output() // #nosec G204
	if err != nil {
		exec.Command("open", dmgPath).Start() // #nosec G204
		runtime.Quit(a.ctx)
		return nil
	}

	mountPoint := ""
	for _, line := range strings.Split(string(out), "\n") {
		if strings.Contains(line, "/Volumes/") {
			fields := strings.Fields(line)
			if len(fields) > 0 {
				mountPoint = fields[len(fields)-1]
			}
		}
	}

	if mountPoint == "" {
		exec.Command("open", dmgPath).Start() // #nosec G204
		runtime.Quit(a.ctx)
		return nil
	}

	entries, _ := os.ReadDir(mountPoint)
	srcApp := ""
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".app") {
			srcApp = filepath.Join(mountPoint, e.Name())
			break
		}
	}

	if srcApp == "" {
		exec.Command("hdiutil", "detach", mountPoint).Run() // #nosec G204
		exec.Command("open", dmgPath).Start()               // #nosec G204
		runtime.Quit(a.ctx)
		return nil
	}

	script := fmt.Sprintf(`#!/bin/bash
while kill -0 %d 2>/dev/null; do sleep 0.1; done
cp -rf '%s' '%s/'
hdiutil detach '%s' -quiet 2>/dev/null
open '%s'
`, os.Getpid(), srcApp, appDir, mountPoint, appPath)

	scriptPath := filepath.Join(os.TempDir(), "axiom-update.sh")
	if err := os.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		exec.Command("hdiutil", "detach", mountPoint).Run() // #nosec G204
		return err
	}

	exec.Command("bash", scriptPath).Start() // #nosec G204
	go func() {
		time.Sleep(100 * time.Millisecond)
		runtime.Quit(a.ctx)
	}()
	return nil
}


func readLines(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	var lines []string
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line != "" && !strings.HasPrefix(line, "#") {
			lines = append(lines, line)
		}
	}
	return lines, sc.Err()
}
