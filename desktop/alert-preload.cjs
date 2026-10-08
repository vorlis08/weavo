const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('alertApi', {
  onData: (cb) => ipcRenderer.on('alert:data', (_e, a) => cb(a)),
  act: (action) => ipcRenderer.send('alert:act', action),
})
