// Authorization endpoint for Layercode client sessions
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔐 Authorization request received:', req.body);
    const { pipeline_id, metadata } = req.body;
    
    // Call real Layercode authorization API
    const layercodeResponse = await fetch('https://api.layercode.com/v1/client_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LAYERCODE_API_KEY}`
      },
      body: JSON.stringify({
        pipeline_id: pipeline_id || process.env.LAYERCODE_PIPELINE_ID,
        metadata: metadata || {}
      })
    });
    
    if (!layercodeResponse.ok) {
      const errorData = await layercodeResponse.text();
      console.error('❌ Layercode auth failed:', layercodeResponse.status, errorData);
      throw new Error(`Layercode authorization failed: ${layercodeResponse.status}`);
    }
    
    const authData = await layercodeResponse.json();
    console.log('🔐 Layercode auth success:', authData);
    
    res.json({
      client_session_key: authData.client_session_key,
      session_id: authData.session_id
    });
    
  } catch (error) {
    console.error('❌ Authorization error:', error);
    res.status(500).json({ error: 'Authorization failed: ' + error.message });
  }
}