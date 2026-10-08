const { contextBridge, ipcRenderer } = require('electron')

// only Weavo's own origin gets the bridge
const TRUSTED = ['https://vorlis08.github.io', 'http://localhost:5173']
if (TRUSTED.includes(location.origin) || process.env.WEAVO_URL?.startsWith(location.origin)) {
  contextBridge.exposeInMainWorld('weavoDesktop', {
    isDesktop: true,
    showAlert: (a) => ipcRenderer.send('alert:show', a),
    closeAlert: (id) => ipcRenderer.send('alert:close', id),
    onAlertAction: (cb) => {
      const fn = (_e, action) => cb(action)
      ipcRenderer.on('alert:action', fn)
      return () => ipcRenderer.removeListener('alert:action', fn)
    },
    focusApp: () => ipcRenderer.send('app:focus'),
    getAutostart: () => ipcRenderer.invoke('autostart:get'),
    setAutostart: (on) => ipcRenderer.invoke('autostart:set', on),
  })
}
