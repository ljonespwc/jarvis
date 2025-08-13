const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvisAPI', {
  startListening: () => ipcRenderer.invoke('start-listening'),
  stopListening: () => ipcRenderer.invoke('stop-listening'),
  getVoiceConfig: () => ipcRenderer.invoke('get-voice-config'),
  
  onVoiceResult: (callback) => {
    ipcRenderer.on('voice-result', (event, result) => callback(result));
    return () => ipcRenderer.removeAllListeners('voice-result');
  },
  
  onVoiceError: (callback) => {
    ipcRenderer.on('voice-error', (event, error) => callback(error));
    return () => ipcRenderer.removeAllListeners('voice-error');
  },
  
  onVoiceStatus: (callback) => {
    ipcRenderer.on('voice-status', (event, status) => callback(status));
    return () => ipcRenderer.removeAllListeners('voice-status');
  },
  
  onVoiceResponse: (callback) => {
    ipcRenderer.on('voice-response', (event, response) => callback(response));
    return () => ipcRenderer.removeAllListeners('voice-response');
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  setSessionId: (sessionId) => ipcRenderer.send('set-session-id', sessionId)
});