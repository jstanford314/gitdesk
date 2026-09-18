import { app, shell, dialog, Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'

const REPO_URL = 'https://github.com/jstanford314/gitdesk'

function send(win: BrowserWindow, action: string): void {
  win.webContents.send('menu:action', action)
}

export function buildAppMenu(win: BrowserWindow, isDev: boolean): Menu {
  const isMac = process.platform === 'darwin'

  const fileMenu: MenuItemConstructorOptions = {
    label: 'File',
    submenu: [
      { label: 'Open Repository…', accelerator: 'CmdOrCtrl+O', click: () => send(win, 'open-repo') },
      { label: 'Clone Repository…', accelerator: 'CmdOrCtrl+Shift+N', click: () => send(win, 'clone-repo') },
      { label: 'New Repository…', accelerator: 'CmdOrCtrl+N', click: () => send(win, 'init-repo') },
      { type: 'separator' },
      { label: 'Switch Repository', click: () => send(win, 'close-repo') },
      { type: 'separator' },
      ...(isMac
        ? [{ role: 'close' } as MenuItemConstructorOptions]
        : [
            { label: 'Preferences…', accelerator: 'CmdOrCtrl+,', click: () => send(win, 'preferences') },
            { type: 'separator' } as MenuItemConstructorOptions,
            { role: 'quit' } as MenuItemConstructorOptions
          ])
    ]
  }

  const viewMenu: MenuItemConstructorOptions = {
    label: 'View',
    submenu: [
      ...(isDev
        ? ([
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' }
          ] as MenuItemConstructorOptions[])
        : []),
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  }

  const helpMenu: MenuItemConstructorOptions = {
    role: 'help',
    submenu: [
      { label: 'GitDesk on GitHub', click: () => shell.openExternal(REPO_URL) },
      { label: 'Report an Issue', click: () => shell.openExternal(`${REPO_URL}/issues`) },
      { type: 'separator' },
      {
        label: 'About GitDesk',
        click: () =>
          dialog.showMessageBox(win, {
            type: 'info',
            title: 'About GitDesk',
            message: 'GitDesk',
            detail: `Version ${app.getVersion()}\n${REPO_URL}`
          })
      }
    ]
  }

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { label: 'Preferences…', accelerator: 'Cmd+,', click: () => send(win, 'preferences') },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          } as MenuItemConstructorOptions
        ]
      : []),
    fileMenu,
    { role: 'editMenu' },
    viewMenu,
    { role: 'windowMenu' },
    helpMenu
  ]

  return Menu.buildFromTemplate(template)
}
