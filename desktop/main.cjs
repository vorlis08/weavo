/**
 * Weavo desktop shell.
 *
 * Loads the deployed Weavo (so every `npm run deploy` updates the desktop app
 * too), lives in the tray, and keeps the page alive in the background so the
 * reminder engine keeps ticking. When a reminder comes due, the page asks this
 * process for a big always-on-top window (reminder.html) in the middle of the
 * screen; the buttons there are sent back to the page, which does the work
 * (mark done, snooze, open).
 */
const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen, shell } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const APP_URL = process.env.WEAVO_URL || 'https://vorlis08.github.io/weavo/'
const APP_ORIGIN = new URL(APP_URL).origin
const ICON = path.join(__dirname, 'icon.png')
const ALERT_W = 680
const ALERT_H = 440
const MAX_ALERT_WINDOWS = 6

app.setAppUserModelId('cz.weavo.desktop')
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

/** @type {BrowserWindow | null} */
let main = null
/** @type {Tray | null} */
let tray = null
let quitting = false
/** reminderId → { win, handled } */
const alerts = new Map()

function createMain(show) {
  main = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 480,
    minHeight: 560,
    show,
    backgroundColor: '#0f0f13',
    icon: ICON,
    autoHideMenuBar: true,
    title: 'Weavo',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // the page's reminder timer must keep running while the window is hidden
      backgroundThrottling: false,
    },
  })
  main.setMenuBarVisibility(false)

  main.webContents.setWindowOpenHandler(({ url }) => {
    const host = new URL(url).hostname
    // Google sign-in opens a popup; everything else goes to the real browser
    if (host === 'accounts.google.com') return { action: 'allow' }
    if (new URL(url).origin !== APP_ORIGIN) void shell.openExternal(url)
    return { action: 'deny' }
  })
  main.webContents.on('did-fail-load', (_e, _code, _desc, _url, isMainFrame) => {
    if (!isMainFrame || quitting) return
    void main.loadFile(path.join(__dirname, 'offline.html'))
    setTimeout(() => !quitting && main && void main.loadURL(APP_URL), 15_000)
  })

  main.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    main.hide()
  })
  void main.loadURL(APP_URL)
}

function showMain() {
  if (!main) createMain(true)
  if (main.isMinimized()) main.restore()
  main.show()
  main.focus()
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }))
  tray.setToolTip('Weavo')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Otevřít Weavo', click: showMain },
      { type: 'separator' },
      {
        label: 'Ukončit (upomínky přestanou chodit)',
        click: () => {
          quitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on('click', showMain)
}

/* ─────────────────────────── big reminder windows ─────────────────────────── */

function openAlert(a) {
  const existing = alerts.get(a.reminderId)
  if (existing && !existing.win.isDestroyed()) {
    existing.win.show()
    existing.win.focus()
    return
  }
  if (alerts.size >= MAX_ALERT_WINDOWS) return

  // centre on the display the cursor is on, each further window cascaded a little
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const { x, y, width, height } = display.workArea
  const n = alerts.size
  const win = new BrowserWindow({
    width: ALERT_W,
    height: ALERT_H,
    x: Math.round(x + (width - ALERT_W) / 2 + n * 28),
    y: Math.round(y + (height - ALERT_H) / 2 + n * 28),
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#14141a',
    icon: ICON,
    title: 'Weavo — upomínka',
    webPreferences: {
      preload: path.join(__dirname, 'alert-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false,
    },
  })
  const entry = { win, handled: false }
  alerts.set(a.reminderId, entry)
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setMenuBarVisibility(false)

  void win.loadFile(path.join(__dirname, 'reminder.html'))
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('alert:data', a)
    win.show()
    win.focus()
    win.moveTop()
    win.flashFrame(true)
  })
  // closing the window without choosing (Alt+F4) means "ask me again soon"
  win.on('closed', () => {
    alerts.delete(a.reminderId)
    if (!entry.handled) sendToMain({ reminderId: a.reminderId, itemId: a.itemId, action: 'snooze', minutes: 5 })
  })
}

function sendToMain(action) {
  if (main && !main.isDestroyed()) main.webContents.send('alert:action', action)
}

function fromTrustedPage(e) {
  try {
    return new URL(e.senderFrame.url).origin === APP_ORIGIN
  } catch {
    return false
  }
}

ipcMain.on('alert:show', (e, a) => {
  if (fromTrustedPage(e) && a && typeof a.reminderId === 'string') openAlert(a)
})
ipcMain.on('alert:close', (e, reminderId) => {
  if (!fromTrustedPage(e)) return
  const entry = alerts.get(reminderId)
  if (entry && !entry.win.isDestroyed()) {
    entry.handled = true
    entry.win.close()
  }
})
// from reminder.html: Done / Snooze / Open
ipcMain.on('alert:act', (e, action) => {
  const entry = alerts.get(action?.reminderId)
  if (!entry || entry.win.webContents !== e.sender) return
  entry.handled = true
  sendToMain(action)
  entry.win.close()
  if (action.action === 'open') showMain()
})
ipcMain.on('app:focus', (e) => fromTrustedPage(e) && showMain())

ipcMain.handle('autostart:get', () => app.getLoginItemSettings().openAtLogin)
ipcMain.handle('autostart:set', (e, on) => {
  if (!fromTrustedPage(e)) return app.getLoginItemSettings().openAtLogin
  app.setLoginItemSettings({ openAtLogin: !!on, args: ['--hidden'] })
  return app.getLoginItemSettings().openAtLogin
})

/* ──────────────────────────────── lifecycle ──────────────────────────────── */

app.on('second-instance', showMain)
app.on('before-quit', () => {
  quitting = true
})
// stay alive in the tray when every window is closed
app.on('window-all-closed', () => {})

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  const hidden = process.argv.includes('--hidden')
  createMain(!hidden)
  createTray()

  // a packaged install starts with Windows on first run — reminders are the point of the app
  if (app.isPackaged) {
    const flag = path.join(app.getPath('userData'), 'autostart-initialised')
    if (!fs.existsSync(flag)) {
      app.setLoginItemSettings({ openAtLogin: true, args: ['--hidden'] })
      fs.writeFileSync(flag, '1')
    }
  }
})
