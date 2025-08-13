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

    // Load Next.js static export
    this.mainWindow.loadFile('out/index.html');

    // Enable DevTools for debugging - should be stable with React SDK
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
  // Just disable security warnings and camera warnings
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  
  // Comprehensive stderr suppression for cleaner terminal output
  const originalStderrWrite = process.stderr.write;
  process.stderr.write = function(string, encoding, fd) {
    if (typeof string === 'string') {
      // Suppress Chrome DevTools protocol spam
      if (string.includes('Request Network.enable failed') ||
          string.includes('Request Network.setAttachDebugStack failed') ||
          string.includes('Request Emulation.setEmulatedMedia failed') ||
          string.includes('Request Emulation.setEmulatedVisionDeficiency failed') ||
          string.includes('Request Network.clearAcceptedEncodingsOverride failed') ||
          string.includes('devtools://devtools/bundled/core/protocol_client') ||
          // Suppress camera deprecation warnings
          string.includes('AVCaptureDeviceTypeExternal is deprecated for Continuity Cameras')) {
        return true; // Suppress these messages
      }
    }
    return originalStderrWrite.call(this, string, encoding, fd);
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