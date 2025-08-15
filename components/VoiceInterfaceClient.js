import { useState, useEffect } from 'react'
import { useLayercodePipeline } from '@layercode/react-sdk'

export default function VoiceInterfaceClient() {
  const [status, setStatus] = useState('Initializing JARVIS...')
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // TTS is now handled by Layercode/Cartesia through the webhook system
  
  // Test electronAPI availability on component mount
  useEffect(() => {
    console.log('🔍 Testing electronAPI availability...')
    if (window.electronAPI) {
      console.log('✅ electronAPI is available:', Object.keys(window.electronAPI))
      // Test the setSessionId function
      window.electronAPI.setSessionId('test-session-' + Date.now())
      console.log('📡 Test sessionId sent to main process')
    } else {
      console.error('❌ electronAPI is NOT available - this is the problem!')
    }
  }, [])
  
  // Console suppression (preserve from vanilla JS version)
  useEffect(() => {
    const originalWarn = console.warn
    const originalError = console.error
    const originalLog = console.log
    
    console.warn = (...args) => {
      const message = args.join(' ')
      if (message.includes('CleanUnusedInitializersAndNodeArgs') || 
          message.includes('onnxruntime') ||
          message.includes('graph.cc') ||
          message.includes('decoder/rnn') ||
          message.includes('_output_0') ||
          message.includes('VAD model failed to load') ||
          message.includes('onSpeechStart') ||
          message.includes('Interruption requested') ||
          message.includes('webSecurity') ||
          message.includes('allowRunningInsecureContent') ||
          message.includes('Content-Security-Policy') ||
          message.includes('Electron Security Warning') ||
          message.includes('Unknown message type received') ||
          message.includes('speech_end_tracking') ||
          message.includes('vad_events') ||
          message.includes('trigger.response.audio.replay_finished')) {
        return
      }
      originalWarn.apply(console, args)
    }
    
    console.error = (...args) => {
      const message = args.join(' ')
      if (message.includes('Electron Security Warning') ||
          message.includes('webSecurity') ||
          message.includes('Content-Security-Policy') ||
          message.includes('allowRunningInsecureContent') ||
          message.includes('Unknown message type received') ||
          message.includes('speech_end_tracking') ||
          message.includes('vad_events') ||
          message.includes('trigger.response.audio.replay_finished')) {
        return
      }
      originalError.apply(console, args)
    }
    
    console.log = (...args) => {
      const message = args.join(' ')
      if (message.includes('Electron Security Warning') ||
          message.includes('webSecurity')) {
        return
      }
      originalLog.apply(console, args)
    }

    return () => {
      console.warn = originalWarn
      console.error = originalError  
      console.log = originalLog
    }
  }, [])

  // Note: Voice commands are now processed via Layercode webhook -> bridge -> local app
  // This ensures notifications and file operations work properly

  // Layercode React SDK integration - LOCAL PROCESSING MODE
  const sdkResult = useLayercodePipeline({
    pipelineId: 'l7l2bv2c',
    authorizeSessionEndpoint: 'https://jarvis-vert-eta.vercel.app/api/authorize',
    metadata: {
      sessionId: 'jarvis-' + Date.now()
    },
    onConnect: ({ sessionId }) => {
      console.log('✅ Connected to Layercode:', sessionId)
      console.log('🔍 SDK Result available functions:', Object.keys(sdkResult))
      setStatus('🎤 JARVIS is listening... Speak naturally')
      
      // Send sessionId to main process for bridge connection
      if (window.electronAPI) {
        console.log('📡 Sending sessionId to main process for bridge:', sessionId)
        window.electronAPI.setSessionId(sessionId)
      } else {
        console.error('❌ electronAPI not available - bridge connection will fail')
      }
      
      // No intro message - let Layercode handle session.start
      console.log('✅ Ready for voice commands - intro handled by Layercode')
    },
    onDisconnect: () => {
      console.log('🔌 Disconnected from Layercode')
      setStatus('Voice processing disconnected')
    },
    onError: (error) => {
      console.error('❌ Layercode error:', error)
      setError('Voice error: ' + error.message)
      setTimeout(() => setError(''), 5000)
    },
    onTranscript: async (transcript) => {
      console.log('📝 Voice input:', transcript.substring(0, 50))
      setStatus(`You said: "${transcript}"`)
      
      // Let Layercode handle the transcript through the webhook system
      // This will go through the bridge to the local app where notifications work
      console.log('🌐 Transcript will be processed via Layercode webhook + bridge system')
    },
    onTurnStarted: () => {
      console.log('🎤 Turn started - user speaking')
      setStatus('🎤 Listening to you...')
    },
    onTurnFinished: async (data) => {
      console.log('🎤 Turn finished - will process via webhook + bridge', data)
      
      // Layercode will handle the processing through webhook -> bridge -> local app
      // where notifications are properly handled
      setStatus('🤖 JARVIS is processing...')
    }
  })

  // Extract values from SDK result
  const { 
    status: layercodeStatus,
    userAudioAmplitude = 0,
    agentAudioAmplitude = 0,
    triggerUserTurnStarted,
    triggerUserTurnFinished 
  } = sdkResult

  return (
    <>
      <div className="header">
        <h1>JARVIS</h1>
        <p className="subtitle">Productivity Assistant</p>
      </div>
      
      <div className="voice-indicators">
        {/* Agent (JARVIS) Speaking Indicator - Top */}
        <SpeakerCard 
          emoji="🤖"
          name="JARVIS"
          amplitude={agentAudioAmplitude}
          speaking={agentAudioAmplitude > 0.001}
          statusText={agentAudioAmplitude > 0.001 ? 'Speaking...' : 'Ready'}
          type="agent"
        />

        {/* User Speaking Indicator - Bottom */}  
        <SpeakerCard 
          emoji="🎤"
          name="You"
          amplitude={userAudioAmplitude}
          speaking={userAudioAmplitude > 0.001}
          statusText={userAudioAmplitude > 0.001 ? 'Speaking...' : 'Listening'}
          type="user"
        />
      </div>
      
    </>
  )
}

function SpeakerCard({ emoji, name, amplitude, speaking, statusText, type }) {
  // Scale amplitude values similar to vanilla JS version
  const scaledAmplitude = type === 'user' ? amplitude * 300 : amplitude * 180
  const height = Math.max(4, scaledAmplitude)
  
  return (
    <div className={`speaker-card speaker-${type} ${speaking ? (type === 'user' ? 'user-speaking' : 'speaking') : ''}`} data-type={type}>
      <div className="speaker-header">
        <span className="speaker-emoji">{emoji}</span>
        <span className="speaker-name">{name}</span>
      </div>
      <div className="amplitude-bars">
        <div className="bar" style={{ height: `${height}px` }}></div>
        <div className="bar" style={{ height: `${height}px`, animationDelay: '0.1s' }}></div>
        <div className="bar" style={{ height: `${height}px`, animationDelay: '0.2s' }}></div>
      </div>
    </div>
  )
}