//go:build windows

package main

import "syscall"

var (
	user32Dll  = syscall.NewLazyDLL("user32.dll")
	keybdEvent = user32Dll.NewProc("keybd_event")
)

const (
	vkControl      = uintptr(0x11)
	vkShift        = uintptr(0x10)
	vkF12          = uintptr(0x7B)
	keyeventfKeyup = uintptr(0x0002)
)

func (a *App) OpenDevTools() {
	keybdEvent.Call(vkControl, 0, 0, 0)
	keybdEvent.Call(vkShift, 0, 0, 0)
	keybdEvent.Call(vkF12, 0, 0, 0)
	keybdEvent.Call(vkF12, 0, keyeventfKeyup, 0)
	keybdEvent.Call(vkShift, 0, keyeventfKeyup, 0)
	keybdEvent.Call(vkControl, 0, keyeventfKeyup, 0)
}
