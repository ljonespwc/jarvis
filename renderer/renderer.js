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
    
    this.initializeLayercode();
    this.setupVisualFeedback();
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
          this.userSpeaking = false;
        },
        onResponse: (response) => {
          console.log('🗣️ JARVIS response:', response.substring(0, 50));
          this.updateStatus(`🤖 JARVIS: "${response}"`);
          this.agentSpeaking = true;
          
          // Auto-reset to listening after response
          setTimeout(() => {
            this.updateStatus('🎤 JARVIS is listening... Speak naturally');
            this.agentSpeaking = false;
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
          console.log('🎤 Turn started');
          this.userSpeaking = true;
        },
        onTurnFinished: () => {
          console.log('⏳ Processing...');
          this.updateStatus('⏳ JARVIS is thinking...');
          this.userSpeaking = false;
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
  
  updateVisualFeedback(data) {
    // Update UI based on audio amplitude data like lickedin
    const voiceCircle = document.getElementById('voiceCircle');
    if (!voiceCircle) return;
    
    // Update visual state based on who's speaking
    voiceCircle.classList.remove('listening', 'speaking');
    
    if (this.userSpeaking) {
      voiceCircle.classList.add('listening');
      voiceCircle.textContent = '🎤';
    } else if (this.agentSpeaking) {
      voiceCircle.classList.add('speaking');
      voiceCircle.textContent = '🗣️';
    } else {
      voiceCircle.textContent = '🤖';
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