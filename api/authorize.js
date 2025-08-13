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
    
    // Generate session credentials
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const sessionKey = `session_${timestamp}_${randomId}`;
    const sessionId = `sess_${timestamp}_${randomId}`;
    
    console.log('🔐 Returning auth data:', { sessionKey, sessionId });
    
    res.json({
      client_session_key: sessionKey,
      session_id: sessionId
    });
    
  } catch (error) {
    console.error('❌ Authorization error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
}