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
  
  setListeningState(isListening) {
    const voiceCircle = document.getElementById('voiceCircle');
    if (!voiceCircle) return;
    
    voiceCircle.classList.remove('listening', 'speaking', 'user-speaking');
    
    if (isListening) {
      voiceCircle.classList.add('listening');
      voiceCircle.textContent = '🎤';
      console.log('👀 Visual: Listening state (blue pulse)');
    }
  }
  
  setSpeakingState(isSpeaking) {
    const voiceCircle = document.getElementById('voiceCircle');
    if (!voiceCircle) return;
    
    if (isSpeaking) {
      voiceCircle.classList.remove('listening', 'user-speaking');
      voiceCircle.classList.add('speaking');
      voiceCircle.textContent = '🗣️';
      console.log('👀 Visual: Agent speaking state (green pulse)');
    }
  }
  
  setUserSpeakingState(userSpeaking) {
    const voiceCircle = document.getElementById('voiceCircle');
    if (!voiceCircle) return;
    
    if (userSpeaking) {
      voiceCircle.classList.remove('listening', 'speaking');
      voiceCircle.classList.add('user-speaking');
      voiceCircle.textContent = '🎙️';
      console.log('👀 Visual: User speaking state (intense blue pulse)');
    }
  }

  updateVisualFeedback(data) {
    // Debug audio amplitude data
    if (data && (data.userAudioAmplitude > 0 || data.agentAudioAmplitude > 0)) {
      console.log('🎧 Audio data:', { 
        user: data.userAudioAmplitude?.toFixed(3), 
        agent: data.agentAudioAmplitude?.toFixed(3) 
      });
    }
    
    // Auto-trigger based on amplitude if available
    if (data?.userAudioAmplitude > 0.01) {
      this.setUserSpeakingState(true);
    } else if (data?.agentAudioAmplitude > 0.01) {
      this.setSpeakingState(true);
    }
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