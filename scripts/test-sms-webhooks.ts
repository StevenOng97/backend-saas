import axios from 'axios';

async function testSmsWebhooks() {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  
  console.log('Testing SMS webhook endpoints...\n');
  
  // Test STOP keyword
  console.log('1. Testing STOP keyword:');
  try {
    const stopResponse = await axios.post(`${baseUrl}/webhooks/twilio/incoming`, {
      From: '+1234567890',
      Body: 'STOP',
      MessageSid: 'SM_test_stop_123',
      To: '+1987654321'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${stopResponse.status}`);
    console.log(`   Response: ${stopResponse.data}`);
  } catch (error) {
    console.error(`   Error: ${error.response?.data || error.message}`);
  }
  
  console.log('\n2. Testing HELP keyword:');
  try {
    const helpResponse = await axios.post(`${baseUrl}/webhooks/twilio/incoming`, {
      From: '+1234567890',
      Body: 'HELP',
      MessageSid: 'SM_test_help_123',
      To: '+1987654321'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${helpResponse.status}`);
    console.log(`   Response: ${helpResponse.data}`);
  } catch (error) {
    console.error(`   Error: ${error.response?.data || error.message}`);
  }
  
  console.log('\n3. Testing START keyword:');
  try {
    const startResponse = await axios.post(`${baseUrl}/webhooks/twilio/incoming`, {
      From: '+1234567890',
      Body: 'START',
      MessageSid: 'SM_test_start_123',
      To: '+1987654321'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${startResponse.status}`);
    console.log(`   Response: ${startResponse.data}`);
  } catch (error) {
    console.error(`   Error: ${error.response?.data || error.message}`);
  }
  
  console.log('\n4. Testing random message:');
  try {
    const randomResponse = await axios.post(`${baseUrl}/webhooks/twilio/incoming`, {
      From: '+1234567890',
      Body: 'Hello, this is a random message',
      MessageSid: 'SM_test_random_123',
      To: '+1987654321'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${randomResponse.status}`);
    console.log(`   Response: ${randomResponse.data}`);
  } catch (error) {
    console.error(`   Error: ${error.response?.data || error.message}`);
  }
  
  console.log('\nWebhook testing completed!');
}

testSmsWebhooks().catch(console.error); 