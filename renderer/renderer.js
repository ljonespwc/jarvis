import LayercodeClient from "https://cdn.jsdelivr.net/npm/@layercode/js-sdk@latest/dist/layercode-js-sdk.esm.js";

class JarvisUI {
  constructor() {
    this.statusDiv = document.getElementById('status');
    this.errorDiv = document.getElementById('error');
    this.todosDiv = document.getElementById('todos');
    this.layercodeClient = null;
    this.currentSessionId = null;
    this.userSpeaking = false;
    this.agentSpeaking = false;
    
    this.suppressOnnxWarnings();
    this.initializeLayercode();
    this.setupVisualFeedback();
  }

  suppressOnnxWarnings() {
    // Suppress ONNX model warnings like in lickedin project
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('CleanUnusedInitializersAndNodeArgs') || 
          message.includes('onnxruntime') ||
          message.includes('graph.cc') ||
          message.includes('decoder/rnn') ||
          message.includes('_output_0') ||
          message.includes('VAD model failed to load') ||
          message.includes('onSpeechStart') ||
          message.includes('Interruption requested')) {
        return; // Suppress these warnings
      }
      originalWarn.apply(console, args);
    };
  }
  
  async initializeLayercode() {
    try {
      console.log('🎤 Initializing Layercode client...');
      
      this.layercodeClient = new LayercodeClient({
        pipelineId: 'l7l2bv2c',
        authorizeSessionEndpoint: 'https://jarvis-vert-eta.vercel.app/api/authorize',
        metadata: {
          sessionId: 'jarvis-' + Date.now()
        },
        // Try to prevent interruptions during agent speech
        pushToTalkEnabled: false,
        interruptible: false,
        vadSensitivity: 0.05, // Even lower sensitivity to reduce false positives  
        speechEndTimeout: 2000, // Wait longer before ending speech
        speechStartThreshold: 0.15, // Higher threshold to start speech detection
        onConnect: ({ sessionId }) => {
          console.log('✅ Connected to Layercode:', sessionId);
          this.currentSessionId = sessionId;
          this.updateStatus('🎤 JARVIS is listening... Speak naturally');
          
          // Debug: Check what's available on the client for amplitude data
          console.log('🔍 Layercode client methods:', Object.getOwnPropertyNames(this.layercodeClient));
          
          // Start polling for amplitude data if it exists
          this.startAmplitudePolling();
        },
        onDisconnect: () => {
          console.log('🔌 Disconnected from Layercode');
          this.updateStatus('Voice processing disconnected');
          this.userSpeaking = false;
          this.agentSpeaking = false;
        },
        onError: (error) => {
          console.error('❌ Layercode error:', error);
          this.handleVoiceError(error);
        },
        onTranscript: (transcript) => {
          console.log('📝 Voice input:', transcript.substring(0, 50));
          this.updateStatus(`You said: "${transcript}"`);
        },
        // Handle data messages like lickedin project
        onDataMessage: (data) => {
          console.log('📨 Data message:', data.type);
          
          // Handle different message types without triggering unknown message errors
          if (data.type === 'agent_transcription') {
            // Agent speaking transcription
          } else if (data.type === 'user_transcription') {
            // User speaking transcription  
          } else if (data.type === 'response.data') {
            // Response data from webhook
          }
        },
        onTurnStarted: () => {
          console.log('🎤 Turn started - user speaking');
          this.updateStatus('🎤 Listening to you...');
        },
        onTurnFinished: () => {
          console.log('⏳ Processing...');
          this.updateStatus('⏳ JARVIS is thinking...');
        },
        onResponse: (response) => {
          console.log('🗣️ JARVIS response:', response.substring(0, 50));
          this.updateStatus(`🤖 JARVIS: "${response}"`);
          
          // Auto-reset to listening after response
          setTimeout(() => {
            this.updateStatus('🎤 JARVIS is listening... Speak naturally');
          }, 4000);
        }
      });

      // Connect to the pipeline
      await this.layercodeClient.connect();
      console.log('🚀 Layercode client connected successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Layercode:', error);
      this.showError('Failed to initialize voice processing: ' + error.message);
    }
  }

  setupVisualFeedback() {
    // Visual feedback for automatic voice detection - no buttons needed
    console.log('🎨 Setting up visual feedback for automatic voice interaction');
  }

  startAmplitudePolling() {
    // Try to access amplitude data from client properties
    setInterval(() => {
      if (this.layercodeClient) {
        const clientProps = this.layercodeClient;
        
        // Check for common amplitude properties
        const userAmp = clientProps.userAudioAmplitude || 
                       clientProps.userAmplitude || 
                       clientProps.micAmplitude || 0;
        
        const agentAmp = clientProps.agentAudioAmplitude || 
                        clientProps.agentAmplitude || 
                        clientProps.speakerAmplitude || 0;
        
        if (userAmp > 0.001 || agentAmp > 0.001) {
          this.updateLiveSpeechIndicators(userAmp, agentAmp);
        }
      }
    }, 100); // Poll at 10fps
  }

  
  updateLiveSpeechIndicators(userAmplitude = 0, agentAmplitude = 0) {
    // Update user speech indicator - like lickedin but with proper scaling for small Layercode values
    const userIndicator = document.getElementById('userIndicator');
    const userBars = userIndicator?.querySelectorAll('.bar');
    const userStatus = userIndicator?.querySelector('.speaking-status');
    
    if (userBars) {
      // Lower threshold for small Layercode amplitude values
      const isUserSpeaking = userAmplitude > 0.001;
      userIndicator.classList.toggle('user-speaking', isUserSpeaking);
      
      userBars.forEach((bar, i) => {
        // Scale up small Layercode amplitude values (0.002-0.3) to visible heights (4-60px)
        const height = Math.max(4, userAmplitude * 200);
        bar.style.height = `${height}px`;
        bar.style.animationDelay = `${i * 0.1}s`;
      });
      
      if (userStatus) {
        userStatus.textContent = isUserSpeaking ? 'Speaking...' : 'Listening';
      }
    }
    
    // Update agent (JARVIS) speech indicator  
    const agentIndicator = document.getElementById('agentIndicator');
    const agentBars = agentIndicator?.querySelectorAll('.bar');
    const agentStatus = agentIndicator?.querySelector('.speaking-status');
    
    if (agentBars) {
      // Lower threshold for small Layercode amplitude values
      const isAgentSpeaking = agentAmplitude > 0.001;
      agentIndicator.classList.toggle('speaking', isAgentSpeaking);
      
      agentBars.forEach((bar, i) => {
        // Scale up small Layercode amplitude values to visible heights
        const height = Math.max(4, agentAmplitude * 200);
        bar.style.height = `${height}px`;
        bar.style.animationDelay = `${i * 0.1}s`;
      });
      
      if (agentStatus) {
        agentStatus.textContent = isAgentSpeaking ? 'Speaking...' : 'Ready';
      }
    }
    
  }

  updateVisualFeedback(data) {
    // Use actual Layercode amplitude data for live speech indicators
    const userAmp = data?.userAudioAmplitude || 0;
    const agentAmp = data?.agentAudioAmplitude || 0;
    
    this.updateLiveSpeechIndicators(userAmp, agentAmp);
  }
  
  handleVoiceError(error) {
    console.error('❌ Voice error:', error);
    this.showError('Voice error: ' + error.message);
    
    // Reset state for automatic voice interaction
    this.userSpeaking = false;
    this.agentSpeaking = false;
    this.updateStatus('Connection error - Please refresh');
  }
  
  updateStatus(message) {
    this.statusDiv.textContent = message;
  }
  
  showError(message) {
    this.errorDiv.textContent = message;
    setTimeout(() => this.clearError(), 5000);
  }
  
  clearError() {
    this.errorDiv.textContent = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new JarvisUI();
});