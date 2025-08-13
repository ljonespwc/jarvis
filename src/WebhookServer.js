const express = require('express');
const cors = require('cors');

class WebhookServer {
  constructor(todoManager, aiProcessor) {
    this.app = express();
    this.server = null;
    this.port = 3001;
    this.todoManager = todoManager;
    this.aiProcessor = aiProcessor;
    this.layercodeSDK = null;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  async initializeLayercodeSDK() {
    try {
      const sdk = await import('@layercode/node-server-sdk');
      this.layercodeSDK = sdk;
      console.log('✅ Layercode SDK loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load Layercode SDK:', error);
      throw error;
    }
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.raw({ type: 'application/json' }));
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Main webhook endpoint for Layercode
    this.app.post('/webhook', async (req, res) => {
      try {
        console.log('📨 Webhook received:', req.body);
        
        if (!this.layercodeSDK) {
          throw new Error('Layercode SDK not initialized');
        }
        
        // For now, let's bypass streaming and just send a simple response
        await this.handleVoiceCommand(req.body, res);
        return;
        
      } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Authorization endpoint for client connections
    this.app.post('/api/authorize', async (req, res) => {
      try {
        console.log('🔐 Authorization request received:', req.body);
        
        // For development, we'll return a simple session key and session ID
        // In production, you'd validate the request and generate proper keys
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const sessionKey = `session_${timestamp}_${randomId}`;
        const sessionId = `sess_${timestamp}_${randomId}`;
        
        console.log('🔐 Returning auth data:', { sessionKey, sessionId });
        
        res.json({
          client_session_key: sessionKey,
          session_id: sessionId
        });
      } catch (error) {
        console.error('❌ Authorization error:', error);
        res.status(500).json({ error: 'Authorization failed' });
      }
    });
  }

  async handleVoiceCommand(payload, res) {
    try {
      const { text, connection_id, session_id, type, turn_id } = payload;
      
      if (type === 'SESSION_START') {
        res.json({ message: 'Hello! I\'m JARVIS, your voice todo assistant. What can I help you with?' });
        return;
      }

      if (!text || text.trim() === '') {
        res.json({ message: 'I didn\'t catch that. Could you please repeat?' });
        return;
      }

      console.log(`🎤 Processing voice command: "${text}"`);

      // Get current todos for context
      const currentTodos = await this.todoManager.readTasks();
      
      // Process command with AI
      const aiResult = await this.aiProcessor.processCommand(text, currentTodos);
      console.log('🤖 AI Result:', aiResult);

      let responseText = '';

      // Execute the identified action
      if (aiResult.action === 'read_tasks') {
        const limit = aiResult.parameters?.limit || 5;
        const tasks = await this.todoManager.getTopTasks(limit);
        
        if (tasks.length === 0) {
          responseText = 'You have no active tasks right now. Great job!';
        } else {
          responseText = `You have ${tasks.length} priority tasks: ${tasks.join(', ')}`;
        }

      } else if (aiResult.action === 'add_task') {
        const taskText = aiResult.parameters?.task;
        if (taskText) {
          await this.todoManager.addTask(taskText);
          responseText = `Added "${taskText}" to your todo list.`;
        } else {
          responseText = 'I couldn\'t understand what task to add. Please try again.';
        }

      } else if (aiResult.action === 'mark_done') {
        const taskMatch = aiResult.parameters?.task_match;
        if (taskMatch) {
          try {
            await this.todoManager.markDone(taskMatch);
            responseText = `Great! I've marked "${taskMatch}" as completed.`;
          } catch (error) {
            responseText = `I couldn't find a task matching "${taskMatch}". Can you be more specific?`;
          }
        } else {
          responseText = 'I couldn\'t understand which task to mark as done. Please try again.';
        }

      } else {
        responseText = aiResult.response || 'I didn\'t understand that command. Try asking "What needs my attention?" or "Add [task name]".';
      }

      // Send response
      console.log(`🗣️ Response: ${responseText}`);
      
      // Send updated task data
      const updatedTodos = await this.todoManager.readTasks();
      
      res.json({
        message: responseText,
        type: 'todos_updated',
        todos: updatedTodos,
        action: aiResult.action,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error handling voice command:', error);
      res.status(500).json({ 
        message: 'Sorry, I encountered an error processing that request.',
        error: error.message 
      });
    }
  }

  async start() {
    // Initialize Layercode SDK first
    await this.initializeLayercodeSDK();
    
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🚀 Webhook server running on http://localhost:${this.port}`);
          console.log(`📡 Webhook endpoint: http://localhost:${this.port}/webhook`);
          console.log(`🔐 Auth endpoint: http://localhost:${this.port}/api/authorize`);
          resolve();
        }
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Webhook server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = WebhookServer;