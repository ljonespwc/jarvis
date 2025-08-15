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
    const { text, type, turn_id, session_id } = req.body || {};
    
    // Extract session ID for bridge communication
    const sessionId = session_id || turn_id || 'default-session';
    
    // Debug: log ALL webhook calls
    console.log('🎤 WEBHOOK DEBUG:', { text, type, sessionId, body: req.body });

    if (type === 'session.start') {
      const response = "How can I help?";
      res.write(`data: ${JSON.stringify({ type: 'response.tts', content: response, turn_id })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'response.end', turn_id })}\n\n`);
      res.end();
      return;
    }

    if (!text || text.trim() === '') {
      const response = 'I didn\'t catch that. Could you please repeat?';
      res.write(`data: ${JSON.stringify({ type: 'response.tts', content: response, turn_id })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'response.end', turn_id })}\n\n`);
      res.end();
      return;
    }

    // Bridge communication - send command to user's local app
    async function sendCommandToBridge(sessionId, text) {
      try {
        console.log('🌉 Sending command to bridge for session:', sessionId);
        
        const response = await fetch(`https://jarvis-vert-eta.vercel.app/api/websocket?sessionId=${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'command',
            command: 'process_voice',
            data: { text }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Bridge error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Received response from local app via bridge');
          return result.data;
        } else {
          throw new Error(result.error || 'Bridge communication error');
        }
        
      } catch (error) {
        console.error('❌ Failed to communicate via bridge:', error);
        throw error;
      }
    }

    // ALWAYS process commands via bridge to local app (where notifications work)
    let responseText = '';

    try {
      console.log('🌉 Processing voice command via bridge...', { sessionId, text });
      responseText = await sendCommandToBridge(sessionId, text);
      
      if (!responseText || responseText === 'undefined') {
        throw new Error('Empty response from bridge');
      }
      
    } catch (error) {
      console.error('❌ Error processing command via bridge:', error);
      
      if (error.message.includes('Bridge error') || error.message.includes('timeout') || error.message.includes('Empty response')) {
        responseText = "Please make sure JARVIS is running on your computer to access your todo file.";
      } else {
        responseText = "Sorry, I had trouble processing your request. Please try again.";
      }
    }

    console.log('🗣️ JARVIS response:', responseText.substring(0, 80) + (responseText.length > 80 ? '...' : ''));

    // Send normal TTS response 
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