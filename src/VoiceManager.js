const EventEmitter = require('events');

class VoiceManager extends EventEmitter {
  constructor() {
    super();
    this.isListening = false;
    this.pipelineId = process.env.LAYERCODE_PIPELINE_ID;
  }

  async initialize() {
    try {
      console.log('🎤 VoiceManager initializing...');
      console.log(`📡 Pipeline ID: ${this.pipelineId}`);
      
      if (!this.pipelineId) {
        throw new Error('LAYERCODE_PIPELINE_ID not found in environment variables');
      }
      
      console.log('✅ VoiceManager initialized for Layercode webhook integration');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize VoiceManager:', error);
      throw error;
    }
  }

  async startListening() {
    if (this.isListening) {
      return { error: 'Already listening' };
    }

    try {
      console.log('🎤 Starting voice listening via Layercode frontend...');
      this.isListening = true;
      
      this.emit('status', 'Ready for voice input - speak to Layercode interface');
      
      return { 
        success: true, 
        status: 'listening',
        message: 'Voice processing active via Layercode pipeline'
      };
    } catch (error) {
      console.error('❌ Error starting voice listener:', error);
      this.isListening = false;
      return { error: error.message };
    }
  }

  async stopListening() {
    if (!this.isListening) {
      return { error: 'Not currently listening' };
    }

    try {
      console.log('🛑 Stopping voice listening...');
      this.isListening = false;
      
      this.emit('status', 'Voice listening stopped');
      
      return { success: true, status: 'stopped' };
    } catch (error) {
      console.error('❌ Error stopping voice listener:', error);
      return { error: error.message };
    }
  }

  getConnectionInfo() {
    return {
      pipelineId: this.pipelineId,
      isListening: this.isListening
    };
  }

  // Method to be called when webhook receives voice data
  handleWebhookVoiceResult(result) {
    console.log('🎤 Voice result received via webhook:', result);
    this.emit('result', result);
  }

  async cleanup() {
    try {
      if (this.isListening) {
        await this.stopListening();
      }
      
      console.log('🧹 VoiceManager cleanup completed');
    } catch (error) {
      console.error('❌ Error during VoiceManager cleanup:', error);
    }
  }
}

module.exports = VoiceManager;