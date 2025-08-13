// Simple test webhook to debug Layercode SDK integration
import { streamResponse } from '@layercode/node-server-sdk';

export default async function handler(req, res) {
  try {
    console.log('Test webhook called with:', req.method, req.body);
    
    return streamResponse(req.body, async ({ stream }) => {
      console.log('Inside streamResponse handler');
      stream.tts('Hello from JARVIS test webhook!');
      stream.end();
    });
  } catch (error) {
    console.error('Error in test webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}