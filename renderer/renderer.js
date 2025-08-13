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
      
      // Get voice config from main process
      const voiceConfig = await window.jarvisAPI.getVoiceConfig();
      console.log('🔧 Voice config received:', voiceConfig);
      
      if (voiceConfig.error) {
        throw new Error(voiceConfig.error);
      }

      this.layercodeClient = new LayercodeClient({
        pipelineId: voiceConfig.pipelineId,
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
          console.log('📝 Transcript:', transcript);
          this.updateStatus(`Processing: "${transcript}"`);
          // Send transcript to our Vercel webhook
          this.sendToVercelWebhook(transcript);
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
      this.layercodeClient.connect();
      console.log('🚀 Layercode client connection initiated');
      
    } catch (error) {
      console.error('❌ Failed to initialize Layercode:', error);
      this.showError('Failed to initialize voice processing: ' + error.message);
    }
  }

  async sendToVercelWebhook(transcript) {
    try {
      console.log('📡 Sending to Vercel webhook:', transcript);
      
      const response = await fetch('https://jarvis-vert-eta.vercel.app/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: transcript,
          type: 'transcription.completed',
          session_id: this.currentSessionId,
          turn_id: 'electron_' + Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      // Handle SSE response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              if (eventData.type === 'response.tts' && eventData.content) {
                responseText = eventData.content;
                this.updateStatus(`JARVIS: "${eventData.content}"`);
                
                // Auto-reset after 3 seconds
                setTimeout(() => {
                  this.updateStatus('Ready - Click microphone to speak');
                  this.isListening = false;
                  this.micButton.classList.remove('listening');
                }, 3000);
              }
            } catch (e) {
              console.log('Ignoring non-JSON SSE line:', line);
            }
          }
        }
      }

      console.log('✅ Webhook response processed:', responseText);
      
    } catch (error) {
      console.error('❌ Error sending to webhook:', error);
      this.showError('Failed to process voice command: ' + error.message);
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