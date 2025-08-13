// JARVIS Layercode authorization endpoint - Vercel serverless function format
export default async function handler(req, res) {
  // Add CORS headers for Electron renderer
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse request body - Vercel serverless function format
    const body = req.body || {};
    
    // Extract pipeline ID from body or use default
    const pipelineId = body.pipeline_id || process.env.LAYERCODE_PIPELINE_ID || 'l7l2bv2c';
    
    // Get Layercode API key from environment
    const layercodeApiKey = process.env.LAYERCODE_API_KEY;
    if (!layercodeApiKey) {
      throw new Error('LAYERCODE_API_KEY not found in environment variables');
    }

    console.log('Authorizing session for pipeline:', pipelineId);

    // Make request to LayerCode authorization API - same as lickedin pattern
    const layercodeResponse = await fetch('https://api.layercode.com/v1/pipelines/authorize_session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${layercodeApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pipeline_id: pipelineId,
        session_context: {
          service: 'JARVIS Voice Todo Assistant',
          sessionId: 'jarvis-' + Date.now()
        }
      })
    });

    if (!layercodeResponse.ok) {
      throw new Error(`LayerCode API error: ${layercodeResponse.status}`);
    }

    const layercodeData = await layercodeResponse.json();
    console.log('✅ Session authorized successfully');
    
    // Return exactly what LayerCode API returns for SDK compatibility
    return res.status(200).json(layercodeData);

  } catch (error) {
    console.error('❌ Authorization failed:', error);
    return res.status(500).json({
      error: 'Voice authorization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      authorized: false
    });
  }
}