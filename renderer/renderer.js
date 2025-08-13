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
        },
        onConnect: ({ sessionId }) => {
          console.log('✅ Connected to Layercode:', sessionId);
          this.currentSessionId = sessionId;
          this.updateStatus('🎤 JARVIS is listening... Speak naturally');
          // Start with listening state to show pulsing
          this.setListeningState(true);
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
          this.setListeningState(false);
        },
        onResponse: (response) => {
          console.log('🗣️ JARVIS response:', response.substring(0, 50));
          this.updateStatus(`🤖 JARVIS: "${response}"`);
          this.setSpeakingState(true);
          
          // Auto-reset to listening after response
          setTimeout(() => {
            this.updateStatus('🎤 JARVIS is listening... Speak naturally');
            this.setSpeakingState(false);
            this.setListeningState(true);
          }, 4000);
        },
        // Add audio amplitude detection like lickedin
        onAudioData: (data) => {
          if (data.userAudioAmplitude > 0.01) {
            if (!this.userSpeaking) {
              this.userSpeaking = true;
              this.updateStatus('🎤 Listening to you...');
            }
          } else {
            this.userSpeaking = false;
          }
          
          if (data.agentAudioAmplitude > 0.01) {
            this.agentSpeaking = true;
          } else {
            this.agentSpeaking = false;
          }
          
          this.updateVisualFeedback(data);
        },
        onTurnStarted: () => {
          console.log('🎤 Turn started - user speaking');
          this.setListeningState(false);
          this.setUserSpeakingState(true);
        },
        onTurnFinished: () => {
          console.log('⏳ Processing...');
          this.updateStatus('⏳ JARVIS is thinking...');
          this.setUserSpeakingState(false);
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