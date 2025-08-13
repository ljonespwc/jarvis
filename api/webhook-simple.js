// JARVIS webhook with file integration
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simple file operations without complex class
const TODO_FILE = join(homedir(), 'Desktop', 'todo.txt');

export default async function handler(req, res) {
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, layercode-signature');
    return res.status(200).end();
  }

  // Set SSE headers with comprehensive CORS
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, layercode-signature');

  // Optional webhook signature verification
  const signature = req.headers['layercode-signature'];
  const webhookSecret = process.env.LAYERCODE_WEBHOOK_SECRET;
  
  if (signature && webhookSecret) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (`sha256=${expectedSignature}` !== signature) {
      console.log('⚠️ Signature mismatch - continuing for development');
    }
  }

  try {
    const { text, type, turn_id } = req.body || {};
    
    // Only log meaningful webhook calls, not internal Layercode messages
    if (type === 'session.start' || type === 'message' || text) {
      console.log('🎤 Voice command:', { text: text?.substring(0, 50), type });
    }

    if (type === 'session.start') {
      const response = 'What can I help you with?';
      res.write(`data: ${JSON.stringify({ type: 'response.tts', content: response })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'response.end' })}\n\n`);
      res.end();
      return;
    }

    if (!text || text.trim() === '') {
      const response = 'I didn\'t catch that. Could you please repeat?';
      res.write(`data: ${JSON.stringify({ type: 'response.tts', content: response })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'response.end' })}\n\n`);
      res.end();
      return;
    }

    // Local server communication functions
    async function callLocalServer(action, data = {}) {
      try {
        const response = await fetch('http://localhost:47821/todo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, data })
        });
        
        const result = await response.json();
        
        if (result.success) {
          return result.data;
        } else {
          throw new Error(result.error || 'Local server error');
        }
      } catch (error) {
        console.error('❌ Failed to call local server:', error);
        throw error;
      }
    }

    async function readTasks() {
      return await callLocalServer('read_tasks');
    }

    async function getPriorityTasks(count = 3) {
      return await callLocalServer('get_priority_tasks', { count });
    }

    async function addTask(taskText) {
      return await callLocalServer('add_task', { text: taskText });
    }

    async function markTaskDone(taskQuery) {
      return await callLocalServer('mark_done', { query: taskQuery });
    }

    async function getStats() {
      return await callLocalServer('get_stats');
    }

    // Process commands with ACTUAL file operations
    const lowerText = text.toLowerCase();
    let responseText = '';

    try {
      if (lowerText.includes('what needs') || lowerText.includes('attention')) {
        const priorityTasks = await getPriorityTasks(3);
        const stats = await getStats();
        
        if (priorityTasks.length === 0) {
          responseText = "Great! You have no active tasks. Time to relax!";
        } else {
          responseText = `You have ${stats.activeCount} active tasks. Your priorities are: ${priorityTasks.join(', ')}`;
        }
        
      } else if (lowerText.includes('add ')) {
        const taskMatch = text.match(/add (.+)/i);
        if (taskMatch) {
          const newTask = taskMatch[1].trim();
          const result = await addTask(newTask);
          responseText = result.message;
        } else {
          responseText = "What would you like me to add to your todo list?";
        }
        
      } else if (lowerText.includes('mark') && (lowerText.includes('done') || lowerText.includes('complete'))) {
        const taskMatch = text.match(/mark (.+?) (?:done|complete)/i) || text.match(/(?:mark|complete) (.+)/i);
        if (taskMatch) {
          const taskQuery = taskMatch[1].trim();
          const result = await markTaskDone(taskQuery);
          responseText = result.success ? result.message : result.message;
        } else {
          responseText = "Which task would you like me to mark as complete?";
        }
        
      } else if (lowerText.includes('read') && (lowerText.includes('list') || lowerText.includes('tasks'))) {
        const tasks = await readTasks();
        if (tasks.length === 0) {
          responseText = "Your todo list is empty. Well done!";
        } else {
          responseText = `You have ${tasks.length} tasks: ${tasks.join(', ')}`;
        }
        
      } else {
        // AI fallback with real tasks
        const tasks = await readTasks();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are JARVIS, a voice todo assistant. Current tasks: ${tasks.join(', ') || 'None'}. Respond helpfully and briefly.`
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.7,
          max_tokens: 100
        });
        responseText = completion.choices[0]?.message?.content || "I didn't understand that. Try asking 'What needs my attention?'";
      }
      
    } catch (error) {
      console.error('❌ Error processing command:', error);
      
      if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
        responseText = "Please make sure JARVIS is running on your computer to access your todo file.";
      } else {
        responseText = "Sorry, I had trouble accessing your todo file. Please try again.";
      }
    }

    console.log('🗣️ JARVIS response:', responseText.substring(0, 80) + (responseText.length > 80 ? '...' : ''));

    // Send SSE response with proper turn_id if available
    res.write(`data: ${JSON.stringify({ type: 'response.tts', content: responseText, turn_id })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'response.end', turn_id })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in webhook:', error);
    res.write(`data: ${JSON.stringify({ type: 'response.tts', content: 'Sorry, I encountered an error. Please try again.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'response.end' })}\n\n`);
    res.end();
  }
}