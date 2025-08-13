const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
require('dotenv').config();

const TodoFileManager = require('./src/TodoFileManager');
const VoiceManager = require('./src/VoiceManager');
const AIProcessor = require('./src/AIProcessor');
const WebhookServer = require('./src/WebhookServer');

class JarvisApp {
  constructor() {
    this.mainWindow = null;
    // Use Desktop todo.txt file
    const desktopTodoPath = path.join(os.homedir(), 'Desktop', 'todo.txt');
    this.todoManager = new TodoFileManager(desktopTodoPath);
    this.voiceManager = new VoiceManager();
    this.aiProcessor = new AIProcessor();
    this.webhookServer = null;
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
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
    ipcMain.handle('get-todos', async () => {
      try {
        return await this.todoManager.readTasks();
      } catch (error) {
        console.error('Error reading todos:', error);
        return { error: error.message };
      }
    });

    ipcMain.handle('add-todo', async (event, taskText) => {
      try {
        await this.todoManager.addTask(taskText);
        return { success: true };
      } catch (error) {
        console.error('Error adding todo:', error);
        return { error: error.message };
      }
    });

    ipcMain.handle('mark-done', async (event, taskMatch) => {
      try {
        await this.todoManager.markDone(taskMatch);
        return { success: true };
      } catch (error) {
        console.error('Error marking todo done:', error);
        return { error: error.message };
      }
    });

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
    await this.todoManager.initialize();
    await this.voiceManager.initialize();
    await this.aiProcessor.initialize();
    
    // Start webhook server
    this.webhookServer = new WebhookServer(this.todoManager, this.aiProcessor);
    await this.webhookServer.start();
  }
}

const jarvisApp = new JarvisApp();

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
  if (jarvisApp.webhookServer) {
    await jarvisApp.webhookServer.stop();
  }
});