import { useState, useEffect } from 'react'
import { useLayercodePipeline } from '@layercode/react-sdk'

export default function VoiceInterfaceClient() {
  const [status, setStatus] = useState('Initializing JARVIS...')
  const [error, setError] = useState('')
  
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

  // Layercode React SDK integration
  const {
    status: layercodeStatus,
    userAudioAmplitude = 0,
    agentAudioAmplitude = 0,
    triggerUserTurnStarted,
    triggerUserTurnFinished
  } = useLayercodePipeline({
    pipelineId: 'l7l2bv2c',
    authorizeSessionEndpoint: 'https://jarvis-vert-eta.vercel.app/api/authorize',
    metadata: {
      sessionId: 'jarvis-' + Date.now()
    },
    onConnect: ({ sessionId }) => {
      console.log('✅ Connected to Layercode:', sessionId)
      setStatus('🎤 JARVIS is listening... Speak naturally')
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
    onTranscript: (transcript) => {
      console.log('📝 Voice input:', transcript.substring(0, 50))
      setStatus(`You said: "${transcript}"`)
    },
    onTurnStarted: () => {
      console.log('🎤 Turn started - user speaking')
      setStatus('🎤 Listening to you...')
    },
    onTurnFinished: () => {
      console.log('⏳ Processing...')
      setStatus('⏳ JARVIS is thinking...')
    },
    onResponse: (response) => {
      console.log('🗣️ JARVIS response:', response.substring(0, 50))
      setStatus(`🤖 JARVIS: "${response}"`)
      
      // Auto-reset to listening after response
      setTimeout(() => {
        setStatus('🎤 JARVIS is listening... Speak naturally')
      }, 4000)
    }
  })

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