import LayercodeClient from "https://cdn.jsdelivr.net/npm/@layercode/js-sdk@latest/dist/layercode-js-sdk.esm.js";

class JarvisUI {
  constructor() {
    this.isListening = false;
    this.micButton = document.getElementById('micButton');
    this.statusDiv = document.getElementById('status');
    this.errorDiv = document.getElementById('error');
    this.todosDiv = document.getElementById('todos');
    this.layercodeClient = null;
    this.currentSessionId = null;
    
    this.initializeLayercode();
    this.setupEventListeners();
  }
  
  async initializeLayercode() {
    try {
      console.log('🎤 Initializing Layercode client...');
      
      // Get authorization from our working API endpoint
      const authResponse = await fetch('https://jarvis-vert-eta.vercel.app/api/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const authData = await authResponse.json();
      
      if (!authResponse.ok || authData.error) {
        throw new Error(authData.message || 'Failed to authorize session');
      }

      console.log('🔧 Authorization received:', authData);

      this.layercodeClient = new LayercodeClient({
        clientSessionKey: authData.client_session_key,
        onConnect: ({ sessionId }) => {
          console.log('✅ Connected to Layercode:', sessionId);
          this.currentSessionId = sessionId;
          this.updateStatus('Ready - Click microphone to speak');
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
        onTranscript: (transcript) => {
          console.log('📝 Transcript received:', transcript);
          this.updateStatus(`Processing: "${transcript}"`);
        },
        onResponse: (response) => {
          console.log('🤖 AI Response:', response);
          this.updateStatus(`JARVIS: "${response}"`);
          
          // Auto-reset after 3 seconds
          setTimeout(() => {
            this.updateStatus('Ready - Click microphone to speak');
            this.isListening = false;
            this.micButton.classList.remove('listening');
          }, 3000);
        },
        onTurnStarted: () => {
          console.log('🎤 Turn started');
          this.updateStatus('Listening...');
        },
        onTurnFinished: () => {
          console.log('🛑 Turn finished');
          this.updateStatus('Processing...');
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


  setupEventListeners() {
    this.micButton.addEventListener('click', () => {
      this.toggleListening();
    });
  }
  
  async toggleListening() {
    try {
      if (!this.isListening) {
        await this.startListening();
      } else {
        await this.stopListening();
      }
    } catch (error) {
      this.showError('Failed to toggle microphone: ' + error.message);
    }
  }
  
  async startListening() {
    try {
      if (!this.layercodeClient) {
        throw new Error('Layercode client not initialized');
      }
      
      console.log('🎤 Starting voice capture...');
      
      this.layercodeClient.triggerUserTurnStarted();
      
      this.isListening = true;
      this.micButton.classList.add('listening');
      this.clearError();
      
      console.log('🎤 Voice capture started');
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      this.showError('Failed to start voice capture: ' + error.message);
    }
  }
  
  async stopListening() {
    try {
      if (this.layercodeClient) {
        this.layercodeClient.triggerUserTurnFinished();
      }
      
      this.isListening = false;
      this.micButton.classList.remove('listening');
      this.updateStatus('Processing...');
      
      console.log('🛑 Voice capture stopped');
    } catch (error) {
      console.error('❌ Failed to stop listening:', error);
      this.showError('Failed to stop voice capture: ' + error.message);
    }
  }
  
  
  handleVoiceError(error) {
    console.error('❌ Voice error:', error);
    this.showError('Voice error: ' + error.message);
    
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
}

document.addEventListener('DOMContentLoaded', () => {
  new JarvisUI();
});