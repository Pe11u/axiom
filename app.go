package main

import (
	"bufio"
	"context"
	"os"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"axiom/internal/engine"
	"axiom/internal/job"
	"axiom/internal/proxy"
)

type App struct {
	ctx    context.Context
	engine *engine.Engine
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
