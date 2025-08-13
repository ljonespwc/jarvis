const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const http = require('http');
const url = require('url');
const crypto = require('crypto');
require('dotenv').config();

// Import OpenAI for local webhook processing
const OpenAI = require('openai').default;

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
    this.sessionId = null; // Will be set from React component
    this.bridgeConnected = false;
    
    // Initialize OpenAI client for local webhook processing
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
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
    
    // Set up IPC for sessionId from renderer
    ipcMain.on('set-session-id', (event, sessionId) => {
      console.log('📡 Received sessionId from renderer:', sessionId);
      this.sessionId = sessionId;
      this.connectToBridge();
    });
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
          if (req.method === 'POST' && parsedUrl.pathname === '/webhook') {
            // Handle Layercode webhook requests
            await this.handleWebhookRequest(req, res);
            
          } else if (req.method === 'POST' && parsedUrl.pathname === '/todo') {
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
                      
                    case 'process_command':
                      // Process voice command and return response text
                      result = await this.processVoiceCommand(data.text);
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

  async handleWebhookRequest(req, res) {
    // Set SSE headers for Layercode compatibility
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, layercode-signature');

    try {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const requestData = JSON.parse(body);
          const { text, type, turn_id } = requestData;

          // Log meaningful webhook calls only
          if (type === 'session.start' || type === 'message' || text) {
            console.log('🎤 Local webhook received:', { text: text?.substring(0, 50), type });
          }

          // Handle session start
          if (type === 'session.start') {
            const response = 'Hello! I\'m JARVIS, your voice todo assistant. What can I help you with?';
            res.write(`data: ${JSON.stringify({ type: 'response.tts', content: response })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'response.end' })}\n\n`);
            res.end();
            return;
          }

          // Handle empty or invalid text
          if (!text || text.trim() === '') {
            const response = 'I didn\'t catch that. Could you please repeat?';
            res.write(`data: ${JSON.stringify({ type: 'response.tts', content: response })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'response.end' })}\n\n`);
            res.end();
            return;
          }

          // Process the voice command
          const responseText = await this.processVoiceCommand(text);

          console.log('🗣️ JARVIS response:', responseText.substring(0, 80) + (responseText.length > 80 ? '...' : ''));

          // Send SSE response
          res.write(`data: ${JSON.stringify({ type: 'response.tts', content: responseText, turn_id })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: 'response.end', turn_id })}\n\n`);
          res.end();

        } catch (error) {
          console.error('❌ Error processing webhook request:', error);
          res.write(`data: ${JSON.stringify({ type: 'response.tts', content: 'Sorry, I encountered an error. Please try again.' })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: 'response.end' })}\n\n`);
          res.end();
        }
      });

    } catch (error) {
      console.error('❌ Webhook request error:', error);
      res.writeHead(500);
      res.end('Server error');
    }
  }

  async processVoiceCommand(text) {
    if (!this.todoManager) {
      return "Sorry, I'm having trouble accessing your todo file system.";
    }

    const lowerText = text.toLowerCase();
    
    try {
      if (lowerText.includes('what needs') || lowerText.includes('attention')) {
        const priorityTasks = await this.todoManager.getPriorityTasks(3);
        const stats = await this.todoManager.getStats();
        
        if (priorityTasks.length === 0) {
          return "Great! You have no active tasks. Time to relax!";
        } else {
          return `You have ${stats.activeCount} active tasks. Your priorities are: ${priorityTasks.join(', ')}`;
        }
        
      } else if (lowerText.includes('add ')) {
        const taskMatch = text.match(/add (.+)/i);
        if (taskMatch) {
          const newTask = taskMatch[1].trim();
          const result = await this.todoManager.addTask(newTask);
          return result.message;
        } else {
          return "What would you like me to add to your todo list?";
        }
        
      } else if (lowerText.includes('mark') && (lowerText.includes('done') || lowerText.includes('complete'))) {
        const taskMatch = text.match(/mark (.+?) (?:done|complete)/i) || text.match(/(?:mark|complete) (.+)/i);
        if (taskMatch) {
          const taskQuery = taskMatch[1].trim();
          const result = await this.todoManager.markTaskDone(taskQuery);
          return result.success ? result.message : result.message;
        } else {
          return "Which task would you like me to mark as complete?";
        }
        
      } else if (lowerText.includes('read') && (lowerText.includes('list') || lowerText.includes('tasks'))) {
        const tasks = await this.todoManager.getActiveTasks();
        if (tasks.length === 0) {
          return "Your todo list is empty. Well done!";
        } else {
          return `You have ${tasks.length} tasks: ${tasks.join(', ')}`;
        }
        
      } else {
        // Use OpenAI for natural language processing
        const tasks = await this.todoManager.getActiveTasks();
        
        if (!this.openai) {
          return "I can help you with: 'What needs my attention?', 'Add [task]', 'Mark [task] done', or 'Read my list'.";
        }

        const completion = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are JARVIS, a voice todo assistant. Current active tasks: ${tasks.join(', ') || 'None'}. Respond helpfully and briefly (1-2 sentences).`
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.7,
          max_tokens: 100
        });
        
        return completion.choices[0]?.message?.content || "I didn't understand that. Try asking 'What needs my attention?'";
      }
      
    } catch (error) {
      console.error('❌ Error processing voice command:', error);
      return "Sorry, I had trouble processing that request. Please try again.";
    }
  }

  async connectToBridge() {
    if (!this.sessionId) {
      console.log('⏳ Waiting for sessionId from renderer...');
      return;
    }
    
    console.log('🌉 Connecting to JARVIS Bridge with session:', this.sessionId);
    
    const pollForCommands = async () => {
      try {
        const response = await fetch(`https://jarvis-vert-eta.vercel.app/api/websocket?sessionId=${this.sessionId}`, {
          method: 'GET'
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.type === 'command') {
            console.log('📨 Received command from bridge:', data.command);
            
            // Process command locally
            const result = await this.processVoiceCommand(data.data.text || data.data);
            
            // Send response back to bridge
            await fetch(`https://jarvis-vert-eta.vercel.app/api/websocket?sessionId=${this.sessionId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'response',
                data: result
              })
            });
            
            console.log('📤 Sent response back to bridge');
          }
          
          if (!this.bridgeConnected) {
            this.bridgeConnected = true;
            console.log('✅ Connected to JARVIS Bridge');
          }
          
        } else {
          console.error('❌ Bridge polling error:', response.status);
        }
        
      } catch (error) {
        if (this.bridgeConnected) {
          console.error('❌ Lost connection to bridge:', error.message);
          this.bridgeConnected = false;
        }
      }
      
      // Continue polling
      setTimeout(pollForCommands, 2000); // Poll every 2 seconds
    };
    
    pollForCommands();
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