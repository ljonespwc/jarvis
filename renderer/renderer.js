import LayercodeClient from "https://cdn.jsdelivr.net/npm/@layercode/js-sdk@latest/dist/layercode-js-sdk.esm.js";

class JarvisUI {
  constructor() {
    this.isListening = false;
    this.micButton = document.getElementById('micButton');
    this.statusDiv = document.getElementById('status');
    this.errorDiv = document.getElementById('error');
    this.layercodeClient = null;
    
    this.initializeLayercode();
    this.setupEventListeners();
  }

  async initializeLayercode() {
    try {
      console.log('🎤 Initializing Layercode client...');
      
      // Get voice config from main process
      console.log('🔧 Getting voice config...');
      const voiceConfig = await window.jarvisAPI.getVoiceConfig();
      console.log('🔧 Voice config received:', voiceConfig);
      
      if (voiceConfig.error) {
        throw new Error(voiceConfig.error);
      }

      console.log('🔧 Creating Layercode client with config:', {
        pipelineId: voiceConfig.pipelineId,
        authEndpoint: voiceConfig.authEndpoint
      });

      this.layercodeClient = new LayercodeClient({
        pipelineId: voiceConfig.pipelineId,
        authorizeSessionEndpoint: voiceConfig.authEndpoint,
        onConnect: ({ sessionId }) => {
          console.log('✅ Connected to Layercode:', sessionId);
          this.updateStatus('Connected - ready for voice commands');
        },
        onDisconnect: () => {
          console.log('🔌 Disconnected from Layercode');
          this.updateStatus('Voice processing disconnected');
          this.isListening = false;
          this.micButton.classList.remove('listening');
        },
        onError: (error) => {
          console.error('❌ Layercode error:', error);
          this.handleVoiceError(error);
        },
        onStatus: (status) => {
          console.log('📡 Layercode status:', status);
          this.updateStatus(`Status: ${status}`);
        },
        onResponse: (response) => {
          console.log('🗣️ Voice response received:', response);
          this.handleVoiceResponse(response);
        },
        onTranscript: (transcript) => {
          console.log('📝 Transcript:', transcript);
          this.updateStatus(`Heard: "${transcript}"`);
        },
        onTurnStarted: () => {
          console.log('🎤 Turn started');
        },
        onTurnFinished: () => {
          console.log('🛑 Turn finished');
        }
      });

      console.log('🔧 Layercode client created, attempting to connect...');
      
      // Connect to the pipeline
      this.layercodeClient.connect();
      console.log('🚀 Layercode client connection initiated');
      
    } catch (error) {
      console.error('❌ Failed to initialize Layercode:', error);
      console.error('❌ Error stack:', error.stack);
      this.showError('Failed to initialize voice processing: ' + error.message);
    }
  }
  
  setupEventListeners() {
    this.micButton.addEventListener('click', () => {
      this.toggleListening();
    });
    
    window.jarvisAPI.onVoiceResult((result) => {
      this.handleVoiceResult(result);
    });
    
    window.jarvisAPI.onVoiceError((error) => {
      this.handleVoiceError(error);
    });
    
    window.jarvisAPI.onVoiceStatus((status) => {
      this.updateStatus(status);
    });
  }
  
  async toggleListening() {
    try {
      if (!this.layercodeClient) {
        this.showError('Voice processing not initialized');
        return;
      }

      if (!this.isListening) {
        await this.startListening();
        
        // Auto-stop after 5 seconds for testing
        setTimeout(() => {
          if (this.isListening) {
            this.stopListening();
          }
        }, 5000);
      } else {
        await this.stopListening();
      }
    } catch (error) {
      this.showError('Failed to toggle microphone: ' + error.message);
    }
  }
  
  async startListening() {
    try {
      console.log('🎤 Attempting to start listening...');
      console.log('🔧 Layercode client available:', !!this.layercodeClient);
      console.log('🔧 Available methods:', Object.keys(this.layercodeClient || {}));
      
      if (!this.layercodeClient) {
        throw new Error('Layercode client not initialized');
      }

      // Start Layercode voice processing
      console.log('🔧 Calling triggerUserTurnStarted...');
      this.layercodeClient.triggerUserTurnStarted();
      
      this.isListening = true;
      this.micButton.classList.add('listening');
      this.updateStatus('Listening... speak now');
      this.clearError();
      
      console.log('🎤 Started voice listening via Layercode');
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      console.error('❌ Error details:', error);
      this.showError('Failed to start voice capture: ' + error.message);
    }
  }
  
  async stopListening() {
    try {
      // Stop Layercode voice processing
      this.layercodeClient.triggerUserTurnFinished();
      
      this.isListening = false;
      this.micButton.classList.remove('listening');
      this.updateStatus('Processing...');
      
      console.log('🛑 Stopped voice listening');
    } catch (error) {
      console.error('❌ Failed to stop listening:', error);
      this.showError('Failed to stop voice capture: ' + error.message);
    }
  }
  
  handleVoiceResponse(response) {
    console.log('🎤 Voice response:', response);
    
    // Handle different types of responses from our webhook
    if (response.type === 'todos_updated') {
      console.log('📋 Todos updated');
      this.updateStatus('Command processed - todo file updated');
    } else {
      this.updateStatus('Command processed');
    }
    
    // Auto-reset after response
    setTimeout(() => {
      if (this.isListening) {
        this.isListening = false;
        this.micButton.classList.remove('listening');
      }
      this.updateStatus('Ready');
    }, 3000);
  }
  
  handleVoiceError(error) {
    console.error('❌ Voice error:', error);
    this.showError('Voice recognition error: ' + error.message);
    
    // Reset listening state
    this.isListening = false;
    this.micButton.classList.remove('listening');
    this.updateStatus('Ready');
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
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new JarvisUI();
});