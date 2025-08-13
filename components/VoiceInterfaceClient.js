import { useState, useEffect } from 'react'
import { useLayercodePipeline } from '@layercode/react-sdk'

export default function VoiceInterfaceClient() {
  const [status, setStatus] = useState('Initializing JARVIS...')
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Local TTS using Web Speech API
  const speakResponse = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 1.0
      
      // Use a more natural voice if available
      const voices = speechSynthesis.getVoices()
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Samantha') || 
        voice.name.includes('Alex') ||
        voice.name.includes('Daniel') ||
        voice.default
      )
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }
      
      console.log('🗣️ Speaking with Web Speech API:', text.substring(0, 50))
      speechSynthesis.speak(utterance)
    } else {
      console.log('❌ Web Speech API not available')
    }
  }
  
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

  // Local voice command processing
  const processVoiceCommand = async (transcript) => {
    if (isProcessing) return
    
    setIsProcessing(true)
    setStatus('⏳ JARVIS is thinking...')
    
    try {
      // Call local server for todo operations (using existing local server)
      const response = await fetch('http://localhost:47821/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'process_command', 
          data: { text: transcript } 
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to process command locally')
      }
      
      const result = await response.json()
      
      if (result.success) {
        // Use Layercode SDK to speak the response
        return result.data
      } else {
        throw new Error(result.error || 'Unknown error')
      }
      
    } catch (error) {
      console.error('❌ Error processing voice command:', error)
      return "Sorry, I had trouble processing that request. Please try again."
    } finally {
      setIsProcessing(false)
    }
  }

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
        window.electronAPI.setSessionId(sessionId)
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
      
      // Process the command locally and speak the response
      const response = await processVoiceCommand(transcript)
      
      if (speak && response) {
        console.log('🗣️ JARVIS response:', response.substring(0, 50))
        speak(response)
        setStatus(`🤖 JARVIS: "${response.substring(0, 50)}..."`)
        
        // Auto-reset to listening after response
        setTimeout(() => {
          setStatus('🎤 JARVIS is listening... Speak naturally')
        }, 4000)
      }
    },
    onTurnStarted: () => {
      console.log('🎤 Turn started - user speaking')
      setStatus('🎤 Listening to you...')
    },
    onTurnFinished: async (data) => {
      console.log('🎤 Turn finished - processing locally', data)
      
      // Check if we have transcript data in the turn finished event
      if (data?.transcript) {
        console.log('📝 Voice input from turn finished:', data.transcript.substring(0, 50))
        setStatus(`You said: "${data.transcript}"`)
        
        // Process the command locally and speak the response
        const response = await processVoiceCommand(data.transcript)
        
        if (response) {
          console.log('🗣️ JARVIS response:', response.substring(0, 50))
          speakResponse(response)
          setStatus(`🤖 JARVIS: "${response.substring(0, 50)}..."`)
          
          // Auto-reset to listening after response
          setTimeout(() => {
            setStatus('🎤 JARVIS is listening... Speak naturally')
          }, 4000)
        } else {
          console.log('❌ No response available')
        }
      }
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