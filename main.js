const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const http = require('http');
const url = require('url');
require('dotenv').config();

const VoiceManager = require('./src/VoiceManager');

let TodoFileManager;
try {
  TodoFileManager = require('./src/TodoFileManager');
  console.log('✅ TodoFileManager loaded successfully');
} catch (error) {
  console.error('❌ Failed to load TodoFileManager:', error);
}

class JarvisApp {
  constructor() {
    this.mainWindow = null;
    this.voiceManager = new VoiceManager();
    this.todoManager = TodoFileManager ? new TodoFileManager() : null;
    this.localServer = null;
    this.serverPort = 47821;
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
    await this.startLocalServer();
  }

  async startLocalServer() {
    return new Promise((resolve, reject) => {
      this.localServer = http.createServer(async (req, res) => {
        // Enable CORS for webhook calls
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const parsedUrl = url.parse(req.url, true);
        
        try {
          if (req.method === 'POST' && parsedUrl.pathname === '/todo') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
              try {
                const { action, data } = JSON.parse(body);
                console.log('📡 Local server received:', action, data);
                
                let result;
                
                if (!this.todoManager) {
                  result = { error: 'TodoFileManager not available' };
                } else {
                  switch (action) {
                    case 'read_tasks':
                      result = await this.todoManager.getActiveTasks();
                      break;
                      
                    case 'get_priority_tasks':
                      result = await this.todoManager.getPriorityTasks(data?.count || 3);
                      break;
                      
                    case 'add_task':
                      result = await this.todoManager.addTask(data.text);
                      break;
                      
                    case 'mark_done':
                      result = await this.todoManager.markTaskDone(data.query);
                      break;
                      
                    case 'get_stats':
                      result = await this.todoManager.getStats();
                      break;
                      
                    default:
                      result = { error: 'Unknown action' };
                  }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: result }));
                
              } catch (error) {
                console.error('❌ Local server error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
              }
            });
            
          } else {
            res.writeHead(404);
            res.end('Not found');
          }
          
        } catch (error) {
          console.error('❌ Server request error:', error);
          res.writeHead(500);
          res.end('Server error');
        }
      });

      this.localServer.listen(this.serverPort, 'localhost', () => {
        console.log(`🌐 JARVIS local server running on http://localhost:${this.serverPort}`);
        resolve();
      });

      this.localServer.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${this.serverPort} is busy, trying ${this.serverPort + 1}`);
          this.serverPort++;
          this.startLocalServer().then(resolve).catch(reject);
        } else {
          reject(error);
        }
      });
    });
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
  
  if (jarvisApp.localServer) {
    jarvisApp.localServer.close();
    console.log('🌐 Local server stopped');
  }
});