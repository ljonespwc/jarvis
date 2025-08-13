// JARVIS Real-time Bridge - Using polling for Vercel compatibility
// Store pending commands and responses for each session
const pendingCommands = new Map() // sessionId -> { command, timestamp }
const pendingResponses = new Map() // sessionId -> { response, timestamp }

// Cleanup old entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  const timeout = 60000 // 60 seconds

  for (const [sessionId, data] of pendingCommands.entries()) {
    if (now - data.timestamp > timeout) {
      pendingCommands.delete(sessionId)
    }
  }

  for (const [sessionId, data] of pendingResponses.entries()) {
    if (now - data.timestamp > timeout) {
      pendingResponses.delete(sessionId)
    }
  }
}, 60000)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { sessionId } = req.query

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId required' })
  }

  if (req.method === 'GET') {
    // Long polling - client checks for commands
    const startTime = Date.now()
    const maxWait = 30000 // 30 seconds max wait
    
    const checkForCommand = () => {
      const command = pendingCommands.get(sessionId)
      
      if (command) {
        pendingCommands.delete(sessionId)
        return res.status(200).json({
          type: 'command',
          ...command
        })
      }
      
      // Keep polling if within time limit
      if (Date.now() - startTime < maxWait) {
        setTimeout(checkForCommand, 1000) // Check every second
      } else {
        // Timeout - send keep-alive
        return res.status(200).json({ type: 'keepalive' })
      }
    }
    
    checkForCommand()
    return
  }

  if (req.method === 'POST') {
    const body = req.body

    if (body.type === 'response') {
      // Client sending response back
      pendingResponses.set(sessionId, {
        response: body.data,
        timestamp: Date.now()
      })
      
      return res.status(200).json({ success: true })
      
    } else if (body.type === 'command') {
      // Webhook sending command to client
      pendingCommands.set(sessionId, {
        command: body.command,
        data: body.data,
        timestamp: Date.now()
      })
      
      // Wait for response
      const startTime = Date.now()
      const maxWait = 10000 // 10 seconds max wait
      
      const checkForResponse = () => {
        const responseData = pendingResponses.get(sessionId)
        
        if (responseData) {
          pendingResponses.delete(sessionId)
          return res.status(200).json({
            success: true,
            data: responseData.response
          })
        }
        
        if (Date.now() - startTime < maxWait) {
          setTimeout(checkForResponse, 500) // Check every 500ms
        } else {
          return res.status(408).json({
            error: 'Response timeout from local client'
          })
        }
      }
      
      checkForResponse()
      return
    }
  }

  res.status(400).json({ error: 'Invalid request' })
}