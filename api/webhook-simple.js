// JARVIS webhook with real todo.txt file integration
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// TodoFileManager will be loaded dynamically in the handler
let todoManager = null;

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

    // Load TodoFileManager dynamically if not already loaded
    if (!todoManager) {
      try {
        const TodoFileManagerModule = await import(path.join(__dirname, '..', 'src', 'TodoFileManager.js'));
        const TodoFileManager = TodoFileManagerModule.default;
        todoManager = new TodoFileManager();
      } catch (error) {
        console.error('❌ Failed to load TodoFileManager:', error);
      }
    }

    // Process commands with real file operations
    let responseText = "I didn't understand that. Try asking 'What needs my attention?'";
    
    if (!todoManager) {
      responseText = "Sorry, I'm having trouble accessing your todo file. Please try again later.";
    } else {
      const lowerText = text.toLowerCase();
      
      try {
        if (lowerText.includes('what needs') || lowerText.includes('attention')) {
          // Get priority tasks from file
          const priorityTasks = await todoManager.getPriorityTasks(3);
          const stats = await todoManager.getStats();
          
          if (priorityTasks.length === 0) {
            responseText = "Great news! You have no active tasks. Time to relax!";
          } else {
            responseText = `You have ${stats.activeCount} active tasks. Your priorities are: ${priorityTasks.join(', ')}`;
          }
          
        } else if (lowerText.includes('add ')) {
          // Add new task to file
          const taskMatch = text.match(/add (.+)/i);
          if (taskMatch) {
            const newTask = taskMatch[1].trim();
            const result = await todoManager.addTask(newTask);
            responseText = result.message;
          } else {
            responseText = "What would you like me to add to your todo list?";
          }
          
        } else if (lowerText.includes('mark') && (lowerText.includes('done') || lowerText.includes('complete'))) {
          // Mark task as done in file
          const taskMatch = text.match(/mark (.+?) (?:done|complete)/i) || text.match(/(?:mark|complete) (.+)/i);
          if (taskMatch) {
            const taskQuery = taskMatch[1].trim();
            const result = await todoManager.markTaskDone(taskQuery);
            responseText = result.message;
            
            if (!result.success && result.activeTasks) {
              const available = result.activeTasks.slice(0, 3).join(', ');
              responseText += ` Your current tasks include: ${available}`;
            }
          } else {
            responseText = "Which task would you like me to mark as complete?";
          }
          
        } else if (lowerText.includes('read') && (lowerText.includes('list') || lowerText.includes('tasks'))) {
          // Read all active tasks
          const activeTasks = await todoManager.getActiveTasks();
          if (activeTasks.length === 0) {
            responseText = "Your todo list is empty. Well done!";
          } else {
            responseText = `You have ${activeTasks.length} tasks: ${activeTasks.join(', ')}`;
          }
          
        } else {
          // Use AI for natural language fallback
          const activeTasks = await todoManager.getActiveTasks();
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are JARVIS, a voice todo assistant. Help with these commands:
                - "What needs my attention?" → List priority tasks
                - "Add [task]" → Add new task  
                - "Mark [task] done" → Complete task
                - "Read my list" → Read all tasks
                
                Current active tasks: ${activeTasks.length > 0 ? activeTasks.join(', ') : 'None'}
                
                Respond naturally and helpfully. Keep responses short (1-2 sentences).`
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
        console.error('❌ Error processing todo command:', error);
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