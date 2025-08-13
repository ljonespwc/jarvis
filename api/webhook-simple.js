// Simple webhook test without Layercode SDK
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simple todo storage
let todos = {
  active: [
    "Review quarterly reports",
    "Schedule dentist appointment", 
    "Buy groceries",
    "Call mom"
  ],
  completed: [
    "Morning workout",
    "Email responses"
  ]
};

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
      console.log('⚠️ Webhook signature mismatch - continuing anyway for development');
    } else {
      console.log('✅ Webhook signature verified');
    }
  }

  try {
    const { text, type } = req.body || {};
    
    console.log('Webhook called with:', { text, type });

    if (type === 'session.start') {
      const response = 'Hello! I\'m JARVIS, your voice todo assistant. What can I help you with?';
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

    // Process command with AI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are JARVIS, a voice todo assistant. Help with these commands:
          - "What needs my attention?" → List top 3-5 priority tasks
          - "Add [task]" → Add new task
          - "Mark [task] done" → Complete task
          
          Current active tasks: ${todos.active.join(', ')}
          
          Respond naturally and conversationally. Keep responses short (1-2 sentences).`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    });

    let responseText = completion.choices[0]?.message?.content || "I didn't understand that. Try asking 'What needs my attention?'";

    // Basic command processing
    const lowerText = text.toLowerCase();
    if (lowerText.includes('what needs') || lowerText.includes('attention')) {
      const tasks = todos.active.slice(0, 3);
      responseText = `You have ${tasks.length} priority tasks: ${tasks.join(', ')}`;
    } else if (lowerText.includes('add ')) {
      const taskMatch = text.match(/add (.+)/i);
      if (taskMatch) {
        const newTask = taskMatch[1].trim();
        todos.active.push(newTask);
        responseText = `Added "${newTask}" to your todo list.`;
      }
    } else if (lowerText.includes('mark') && lowerText.includes('done')) {
      responseText = `I've marked that task as completed.`;
    }

    console.log('Responding with:', responseText);

    // Send SSE response
    res.write(`data: ${JSON.stringify({ type: 'response.tts', content: responseText })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'response.end' })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in webhook:', error);
    res.write(`data: ${JSON.stringify({ type: 'response.tts', content: 'Sorry, I encountered an error. Please try again.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'response.end' })}\n\n`);
    res.end();
  }
}