const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('obsTriviaDesktop', {
  isElectron: true,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  getSecret: (service, account) => ipcRenderer.invoke('secrets:get', service, account),
  setSecret: (service, account, password) =>
    ipcRenderer.invoke('secrets:set', service, account, password),
  deleteSecret: (service, account) => ipcRenderer.invoke('secrets:delete', service, account),
});
