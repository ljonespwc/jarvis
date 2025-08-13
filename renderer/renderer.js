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
        // Add debug logging to see all available events
        onAny: (eventName, data) => {
          console.log('🎧 Layercode event:', eventName, data);
          
          // Check for any amplitude-related data in events
          if (data && (data.userAudioAmplitude !== undefined || data.agentAudioAmplitude !== undefined)) {
            console.log('🎤 Found amplitude data!', data);
            this.updateVisualFeedback(data);
          }
        },
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
        // Try different event names for audio data
        onAudioLevel: (data) => {
          console.log('🎧 onAudioLevel:', data);
          this.updateVisualFeedback(data);
        },
        onAmplitudeData: (data) => {
          console.log('🎧 onAmplitudeData:', data);
          this.updateVisualFeedback(data);
        },
        onVoiceActivity: (data) => {
          console.log('🎧 onVoiceActivity:', data);
          this.updateVisualFeedback(data);
        },
        onTurnStarted: () => {
          console.log('🎤 Turn started - user speaking');
          this.updateStatus('🎤 Listening to you...');
          
          // Simulate user speaking with fake amplitude to test UI
          this.simulateUserSpeaking();
        },
        onTurnFinished: () => {
          console.log('⏳ Processing...');
          this.updateStatus('⏳ JARVIS is thinking...');
          
          // Stop simulating user speaking
          this.stopSimulation();
        },
        onResponse: (response) => {
          console.log('🗣️ JARVIS response:', response.substring(0, 50));
          this.updateStatus(`🤖 JARVIS: "${response}"`);
          
          // Simulate agent speaking
          this.simulateAgentSpeaking();
          
          // Auto-reset to listening after response
          setTimeout(() => {
            this.updateStatus('🎤 JARVIS is listening... Speak naturally');
            this.stopSimulation();
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
        
        if (userAmp > 0 || agentAmp > 0) {
          console.log('📊 Found amplitude data via polling:', { user: userAmp, agent: agentAmp });
          this.updateLiveSpeechIndicators(userAmp, agentAmp);
        }
      }
    }, 100); // Poll at 10fps
  }

  simulateUserSpeaking() {
    // Test the UI with fake user amplitude data
    console.log('🧪 Testing UI with fake user amplitude');
    let amplitude = 0.5;
    this.userSimulation = setInterval(() => {
      // Random amplitude between 0.2 and 0.8
      amplitude = 0.2 + Math.random() * 0.6;
      this.updateLiveSpeechIndicators(amplitude, 0);
    }, 100);
  }

  simulateAgentSpeaking() {
    // Test the UI with fake agent amplitude data
    console.log('🧪 Testing UI with fake agent amplitude');
    let amplitude = 0.4;
    this.agentSimulation = setInterval(() => {
      // Random amplitude between 0.1 and 0.7
      amplitude = 0.1 + Math.random() * 0.6;
      this.updateLiveSpeechIndicators(0, amplitude);
    }, 100);
  }

  stopSimulation() {
    if (this.userSimulation) {
      clearInterval(this.userSimulation);
      this.userSimulation = null;
    }
    if (this.agentSimulation) {
      clearInterval(this.agentSimulation);
      this.agentSimulation = null;
    }
    // Reset to idle state
    this.updateLiveSpeechIndicators(0, 0);
  }
  
  updateLiveSpeechIndicators(userAmplitude = 0, agentAmplitude = 0) {
    // Update user speech indicator - like lickedin
    const userIndicator = document.getElementById('userIndicator');
    const userBars = userIndicator?.querySelectorAll('.bar');
    const userStatus = userIndicator?.querySelector('.speaking-status');
    
    if (userBars) {
      const isUserSpeaking = userAmplitude > 0.01;
      userIndicator.classList.toggle('user-speaking', isUserSpeaking);
      
      userBars.forEach((bar, i) => {
        // Scale bars based on actual amplitude like lickedin: Math.max(8, amplitude * 15)
        const height = Math.max(4, userAmplitude * 30);
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
      const isAgentSpeaking = agentAmplitude > 0.01;
      agentIndicator.classList.toggle('speaking', isAgentSpeaking);
      
      agentBars.forEach((bar, i) => {
        const height = Math.max(4, agentAmplitude * 30);
        bar.style.height = `${height}px`;
        bar.style.animationDelay = `${i * 0.1}s`;
      });
      
      if (agentStatus) {
        agentStatus.textContent = isAgentSpeaking ? 'Speaking...' : 'Ready';
      }
    }
    
    // Debug logging
    if (userAmplitude > 0 || agentAmplitude > 0) {
      console.log('🎤 Live audio:', { 
        user: userAmplitude?.toFixed(3), 
        agent: agentAmplitude?.toFixed(3) 
      });
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