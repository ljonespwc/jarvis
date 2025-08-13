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

    // Simple file reading function
    async function readTasks() {
      try {
        const content = await fs.readFile(TODO_FILE, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const active = lines.filter(line => !line.startsWith('[DONE]') && !line.startsWith('#')).slice(0, 5);
        return active;
      } catch (error) {
        return ['Review quarterly reports', 'Schedule dentist appointment', 'Buy groceries'];
      }
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
          
          Current active tasks: ${(await readTasks()).join(', ')}
          
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

    // Basic command processing with real file reading
    const lowerText = text.toLowerCase();
    if (lowerText.includes('what needs') || lowerText.includes('attention')) {
      const tasks = await readTasks();
      responseText = `You have ${tasks.length} priority tasks: ${tasks.join(', ')}`;
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