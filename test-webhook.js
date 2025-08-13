#!/usr/bin/env node

const http = require('http');

async function testWebhook() {
  console.log('🧪 Testing JARVIS Webhook Integration...\n');

  // Test payload that mimics what Layercode would send
  const testPayloads = [
    {
      type: 'SESSION_START',
      connection_id: 'test_conn_123',
      session_id: 'test_session_456',
      turn_id: 'turn_001',
      text: null
    },
    {
      type: 'MESSAGE',
      text: 'what needs my attention',
      connection_id: 'test_conn_123',
      session_id: 'test_session_456',
      turn_id: 'turn_002'
    },
    {
      type: 'MESSAGE', 
      text: 'add call dentist for appointment',
      connection_id: 'test_conn_123',
      session_id: 'test_session_456',
      turn_id: 'turn_003'
    },
    {
      type: 'MESSAGE',
      text: 'mark dentist done',
      connection_id: 'test_conn_123',
      session_id: 'test_session_456',
      turn_id: 'turn_004'
    }
  ];

  try {
    // Test health check first
    console.log('1️⃣ Testing health check endpoint...');
    await testEndpoint('GET', '/health');
    console.log('✅ Health check passed\n');

    // Test auth endpoint
    console.log('2️⃣ Testing auth endpoint...');
    await testEndpoint('POST', '/api/authorize', {});
    console.log('✅ Auth endpoint working\n');

    // Test webhook with each payload
    for (let i = 0; i < testPayloads.length; i++) {
      const payload = testPayloads[i];
      console.log(`${i + 3}️⃣ Testing webhook with: "${payload.text || payload.type}"`);
      await testEndpoint('POST', '/webhook', payload);
      console.log('✅ Webhook test passed\n');
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('🎉 All webhook tests passed!');
    console.log('\n📋 Next steps:');
    console.log('1. Configure your Layercode webhook URL to: http://localhost:3001/webhook');
    console.log('2. Start the Electron app with: npm start');
    console.log('3. Test voice commands through Layercode interface');
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
    process.exit(1);
  }
}

function testEndpoint(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`   Response: ${res.statusCode} ${responseBody.slice(0, 100)}${responseBody.length > 100 ? '...' : ''}`);
          resolve(responseBody);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Connection error: ${err.message}`));
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Check if server is running first
console.log('Checking if webhook server is running on http://localhost:3001...\n');

http.get('http://localhost:3001/health', (res) => {
  if (res.statusCode === 200) {
    testWebhook();
  } else {
    console.error('❌ Webhook server not running. Start it first with: npm start');
  }
}).on('error', () => {
  console.error('❌ Webhook server not running on http://localhost:3001');
  console.log('💡 Start the Electron app first with: npm start');
  process.exit(1);
});