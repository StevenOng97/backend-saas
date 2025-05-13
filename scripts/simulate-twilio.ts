import axios from 'axios';
import prisma from '../lib/prisma';
import { SmsStatus } from '@prisma/client';
async function main() {  
  try {
    console.log('Simulating Twilio webhook calls...');
    
    // Get two most recent SMS logs with status 'queued'
    const smsLogs = await prisma.smsLog.findMany({
      where: {
        status: SmsStatus.QUEUED,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 2,
    });
    
    if (smsLogs.length === 0) {
      console.log('No queued SMS logs found. Send some invites first!');
      return;
    }

    console.log(`Found ${smsLogs.length} SMS logs to update.`);
    
    // For each SMS log, simulate a webhook call
    for (let i = 0; i < smsLogs.length; i++) {
      const sms = smsLogs[i];
      
      // First one delivered, second one failed
      const status = i === 0 ? SmsStatus.DELIVERED : SmsStatus.FAILED;
      
      console.log(`Simulating webhook for SMS ${sms.id} with SID ${sms.twilioSid} -> status: ${status}`);
      
      const response = await axios.post(`${process.env.BACKEND_URL}/webhooks/twilio`, {
        sid: sms.twilioSid,
        status,
      });
      
      console.log(`Response: [${response.status}] ${JSON.stringify(response.data)}`);
    }
    
    // Verify the updates
    const updatedSmsLogs = await prisma.smsLog.findMany({
      where: {
        id: {
          in: smsLogs.map(sms => sms.id),
        },
      },
    });
    
    console.log('Updated SMS logs:');
    updatedSmsLogs.forEach(sms => {
      console.log(`- SMS ${sms.id}: ${sms.status}`);
    });
    
  } catch (error) {
    console.error('Error simulating webhooks:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error); 