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
      minWidth: 350,
      minHeight: 400,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: false,  // Disable for development
        allowRunningInsecureContent: true,
        experimentalFeatures: true
      },
      titleBarStyle: 'default',
      resizable: true,
      alwaysOnTop: false,
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

// Disable Chrome/Electron noise at the source with command line switches
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Suppress Chrome logging and DevTools errors
app.commandLine.appendSwitch('--log-level', '3'); // Only fatal errors
app.commandLine.appendSwitch('--disable-logging');
app.commandLine.appendSwitch('--silent-debugger-extension-api');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');

app.whenReady().then(async () => {

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