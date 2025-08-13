// Vercel serverless function for Layercode webhook
const { OpenAI } = require('openai');

// Layercode webhook signature verification
function verifyWebhookSignature(payload, signature, secret) {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simple in-memory todo management (for demo - you'd use a database in production)
let todos = {
  active: [
    "Call dentist for appointment",
    "Buy groceries for dinner", 
    "Review quarterly report",
    "Schedule team meeting",
    "Write project proposal",
    "Clean garage",
    "Pay utility bills"
  ],
  completed: [
    "Called mom",
    "Paid rent"
  ]
};

async function processCommand(speechText, currentTodos) {
  try {
    console.log(`Processing command: "${speechText}"`);
    
    if (!openai) {
      return processCommandFallback(speechText, currentTodos);
    }

    const systemPrompt = `You are JARVIS, a voice assistant for todo lists. 
Current todos: ${JSON.stringify(currentTodos, null, 2)}

Extract the action from the user's speech and respond with a function call.
Be natural and conversational in your responses.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: speechText
        }
      ],
      functions: [
        {
          name: "add_task",
          description: "Add a new task to the todo list",
          parameters: {
            type: "object",
            properties: {
              task: { type: "string", description: "The task to add" },
              priority: { type: "string", enum: ["high", "normal", "low"], default: "normal" }
            },
            required: ["task"]
          }
        },
        {
          name: "mark_done",
          description: "Mark a task as completed",
          parameters: {
            type: "object",
            properties: {
              task_match: { type: "string", description: "Text to match against existing tasks" }
            },
            required: ["task_match"]
          }
        },
        {
          name: "read_tasks",
          description: "Read priority tasks aloud",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "number", default: 5 },
              filter: { type: "string", enum: ["all", "priority", "recent"], default: "priority" }
            }
          }
        }
      ],
      function_call: "auto"
    });

    const choice = response.choices[0];
    
    if (choice.function_call) {
      return {
        action: choice.function_call.name,
        parameters: JSON.parse(choice.function_call.arguments),
        response: choice.message.content || generateDefaultResponse(choice.function_call.name)
      };
    } else {
      return {
        action: 'unknown',
        response: choice.message.content || "I'm not sure what you want me to do. Can you be more specific?"
      };
    }

  } catch (error) {
    console.error('Error processing command with OpenAI:', error);
    return processCommandFallback(speechText, currentTodos);
  }
}

function processCommandFallback(speechText, currentTodos) {
  const text = speechText.toLowerCase();
  
  console.log('Using fallback command processing');

  if (text.includes('what needs') || text.includes('attention') || text.includes('priority')) {
    return {
      action: 'read_tasks',
      parameters: { limit: 5, filter: 'priority' },
      response: "Here are your top priority tasks:"
    };
  }
  
  if (text.includes('add ') || text.includes('create ') || text.includes('new task')) {
    const taskMatch = text.match(/(?:add|create|new task)\s+(.+)/);
    if (taskMatch) {
      return {
        action: 'add_task',
        parameters: { task: taskMatch[1].trim(), priority: 'normal' },
        response: `I've added "${taskMatch[1].trim()}" to your list.`
      };
    }
  }
  
  if (text.includes('done') || text.includes('complete') || text.includes('finished')) {
    const taskMatch = text.match(/(?:done|complete|finished)\s+(.+)/);
    if (taskMatch) {
      return {
        action: 'mark_done',
        parameters: { task_match: taskMatch[1].trim() },
        response: `I've marked "${taskMatch[1].trim()}" as completed.`
      };
    }
  }
  
  if (text.includes('read') || text.includes('list') || text.includes('show')) {
    return {
      action: 'read_tasks',
      parameters: { limit: 10, filter: 'all' },
      response: "Here are all your tasks:"
    };
  }

  return {
    action: 'unknown',
    response: "I didn't understand that command. Try saying 'What needs my attention?' or 'Add [task name]'."
  };
}

function generateDefaultResponse(actionName) {
  const responses = {
    'add_task': "I've added that task to your list.",
    'mark_done': "Great! I've marked that task as completed.",
    'read_tasks': "Here are your tasks:"
  };
  
  return responses[actionName] || "Task processed successfully.";
}

export default async function handler(req, res) {
  // Use manual SSE implementation - this works reliably
  return handleSSEResponse(req, res);
}


// SSE implementation for Layercode TTS responses
async function handleSSEResponse(req, res) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { text, connection_id, session_id, type, turn_id } = req.body;
    
    if (type === 'session.start') {
      const event = {
        type: "response.tts",
        content: 'Hello! I\'m JARVIS v1.0, your voice todo assistant. What can I help you with?',
        turn_id: turn_id
      };
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      
      const endEvent = { type: "response.end", turn_id: turn_id };
      res.write(`data: ${JSON.stringify(endEvent)}\n\n`);
      res.end();
      return;
    }

    if (!text || text.trim() === '') {
      const event = {
        type: "response.tts",
        content: 'I didn\'t catch that. Could you please repeat?',
        turn_id: turn_id
      };
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      
      const endEvent = { type: "response.end", turn_id: turn_id };
      res.write(`data: ${JSON.stringify(endEvent)}\n\n`);
      res.end();
      return;
    }

    console.log(`🎤 Processing voice command: "${text}"`);

    // Process command with AI
    const aiResult = await processCommand(text, todos);
    console.log('🤖 AI Result:', aiResult);

    let responseText = '';

    // Execute the identified action (same logic as before)
    if (aiResult.action === 'read_tasks') {
      const limit = aiResult.parameters?.limit || 5;
      const tasks = todos.active.slice(0, limit);
      
      if (tasks.length === 0) {
        responseText = 'You have no active tasks right now. Great job!';
      } else {
        responseText = `You have ${tasks.length} priority tasks: ${tasks.join(', ')}`;
      }
    } else if (aiResult.action === 'add_task') {
      const taskText = aiResult.parameters?.task;
      if (taskText) {
        todos.active.push(taskText);
        responseText = `Added "${taskText}" to your todo list.`;
      } else {
        responseText = 'I couldn\'t understand what task to add. Please try again.';
      }
    } else if (aiResult.action === 'mark_done') {
      const taskMatch = aiResult.parameters?.task_match;
      if (taskMatch) {
        const taskIndex = todos.active.findIndex(task => 
          task.toLowerCase().includes(taskMatch.toLowerCase())
        );
        
        if (taskIndex !== -1) {
          const completedTask = todos.active.splice(taskIndex, 1)[0];
          todos.completed.push(completedTask);
          responseText = `Great! I've marked "${completedTask}" as completed.`;
        } else {
          responseText = `I couldn't find a task matching "${taskMatch}". Can you be more specific?`;
        }
      } else {
        responseText = 'I couldn\'t understand which task to mark as done. Please try again.';
      }
    } else {
      responseText = aiResult.response || 'I didn\'t understand that command. Try asking "What needs my attention?" or "Add [task name]".';
    }

    console.log(`🗣️ Speaking: ${responseText}`);
    
    // Send TTS event
    const ttsEvent = {
      type: "response.tts",
      content: responseText,
      turn_id: turn_id
    };
    res.write(`data: ${JSON.stringify(ttsEvent)}\n\n`);
    
    // Send end event
    const endEvent = { type: "response.end", turn_id: turn_id };
    res.write(`data: ${JSON.stringify(endEvent)}\n\n`);
    res.end();

  } catch (error) {
    console.error('❌ Error in manual SSE:', error);
    const errorEvent = {
      type: "response.tts",
      content: 'Sorry, I encountered an error processing that request.',
      turn_id: req.body?.turn_id
    };
    res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    
    const endEvent = { type: "response.end", turn_id: req.body?.turn_id };
    res.write(`data: ${JSON.stringify(endEvent)}\n\n`);
    res.end();
  }
}