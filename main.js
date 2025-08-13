const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
require('dotenv').config();

const VoiceManager = require('./src/VoiceManager');

class JarvisApp {
  constructor() {
    this.mainWindow = null;
    this.voiceManager = new VoiceManager();
  }

  createWindow() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: false,  // Disable for development
        allowRunningInsecureContent: true,
        experimentalFeatures: true
      },
      titleBarStyle: 'hiddenInset',
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: false
    });

    this.mainWindow.loadFile('renderer/index.html');

    // Always open DevTools for debugging in separate window
    this.mainWindow.webContents.openDevTools({ mode: 'detach' });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupIPC() {
    ipcMain.handle('start-listening', async () => {
      try {
        return await this.voiceManager.startListening();
      } catch (error) {
        console.error('Error starting voice listener:', error);
        return { error: error.message };
      }
    });

    ipcMain.handle('stop-listening', async () => {
      try {
        return await this.voiceManager.stopListening();
      } catch (error) {
        console.error('Error stopping voice listener:', error);
        return { error: error.message };
      }
    });

    ipcMain.handle('get-voice-config', async () => {
      try {
        return this.voiceManager.getConnectionInfo();
      } catch (error) {
        console.error('Error getting voice config:', error);
        return { error: error.message };
      }
    });
  }

  async initialize() {
    await this.voiceManager.initialize();
  }
}

const jarvisApp = new JarvisApp();

app.whenReady().then(async () => {
  // Suppress Electron warnings and devtools protocol messages - clean console
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  process.env.ELECTRON_DISABLE_LOGGING = 'true';
  
  // Suppress stderr output for devtools protocol messages
  const originalStderrWrite = process.stderr.write;
  process.stderr.write = function(string, encoding, fd) {
    if (typeof string === 'string' && (
        string.includes('devtools') ||
        string.includes('protocol_client') ||
        string.includes('bundled/core/protocol_client') ||
        string.includes('Network.enable') ||
        string.includes('ERROR:CONSOLE') ||
        string.includes('clearAcceptedEncodingsOverride') ||
        string.includes('setEmulatedVisionDeficiency')
    )) {
      return true; // Suppress stderr devtools messages
    }
    return originalStderrWrite.call(this, string, encoding, fd);
  };
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  console.log = (...args) => {
    const message = args.join(' ');
    if (message.includes('devtools') || 
        message.includes('protocol_client') ||
        message.includes('Network.enable') ||
        message.includes('Network.setAttachDebugStack') ||
        message.includes('Emulation.setEmulated') ||
        message.includes('NSCameraUsage') ||
        message.includes('Request Network') ||
        message.includes('ERROR:CONSOLE') ||
        message.includes('bundled/core/protocol_client') ||
        message.includes('clearAcceptedEncodingsOverride') ||
        message.includes('setEmulatedVisionDeficiency') ||
        message.includes('AVCaptureDeviceTypeExternal') ||
        message.includes('NSCameraUsageContinuityCameraDeviceType')) {
      return; // Suppress these messages
    }
    originalConsoleLog.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = args.join(' ');
    if (message.includes('devtools') || 
        message.includes('protocol_client') ||
        message.includes('ExtensionLoadWarning')) {
      return; // Suppress these warnings
    }
    originalConsoleWarn.apply(console, args);
  };
  
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('devtools') || 
        message.includes('protocol_client') ||
        message.includes('ERROR:CONSOLE') ||
        message.includes('bundled/core/protocol_client') ||
        message.includes('Network.enable') ||
        message.includes('Network.setAttachDebugStack') ||
        message.includes('Emulation.setEmulated') ||
        message.includes('clearAcceptedEncodingsOverride') ||
        message.includes('setEmulatedVisionDeficiency')) {
      return; // Suppress these errors
    }
    originalConsoleError.apply(console, args);
  };

  await jarvisApp.initialize();
  jarvisApp.setupIPC();
  jarvisApp.createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      jarvisApp.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (jarvisApp.voiceManager) {
    await jarvisApp.voiceManager.cleanup();
  }
});