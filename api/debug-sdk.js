export default async function handler(req, res) {
  try {
    // Dynamic import to debug SDK loading
    const { streamResponse } = await import('@layercode/node-server-sdk');
    
    console.log('SDK imported successfully:', typeof streamResponse);
    
    return streamResponse(req.body, async ({ stream }) => {
      stream.tts('SDK import successful!');
      stream.end();
    });
  } catch (error) {
    console.error('SDK import error:', error);
    return res.status(500).json({ 
      error: 'SDK import failed',
      message: error.message,
      stack: error.stack
    });
  }
}