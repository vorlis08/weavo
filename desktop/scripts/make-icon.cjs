// renders public/favicon.svg to a 512px icon.png (run: npm run icon)
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

app.whenReady().then(async () => {
  const svg = fs.readFileSync(path.join(__dirname, '../../public/favicon.svg'), 'utf8')
  const html = `<html><body style="margin:0;background:transparent"><img id="i" style="width:512px;height:512px;display:block" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body></html>`
  const win = new BrowserWindow({ width: 512, height: 512, show: false, transparent: true, frame: false, useContentSize: true, webPreferences: { offscreen: false } })
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  await new Promise((r) => setTimeout(r, 300))
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 })
  fs.writeFileSync(path.join(__dirname, '../icon.png'), img.toPNG())
  app.quit()
})
