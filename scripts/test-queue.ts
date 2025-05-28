import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

async function testQueue() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const smsQueue = app.get<Queue>('BullQueue_sms');
    
    console.log('Testing queue connection...');
    
    // Check queue health
    const waiting = await smsQueue.getWaiting();
    const active = await smsQueue.getActive();
    const completed = await smsQueue.getCompleted();
    const failed = await smsQueue.getFailed();
    
    console.log('Queue Status:');
    console.log(`- Waiting: ${waiting.length}`);
    console.log(`- Active: ${active.length}`);
    console.log(`- Completed: ${completed.length}`);
    console.log(`- Failed: ${failed.length}`);
    
    // Add a test job
    console.log('\nAdding test job...');
    const job = await smsQueue.add('send', {
      businessId: 'test-business',
      customerId: 'test-customer',
      inviteId: 'test-invite',
      message: 'Test message'
    });
    
    console.log(`Test job added with ID: ${job.id}`);
    
    // Wait a bit and check status
    setTimeout(async () => {
      const waitingAfter = await smsQueue.getWaiting();
      const activeAfter = await smsQueue.getActive();
      console.log(`\nAfter adding job:`);
      console.log(`- Waiting: ${waitingAfter.length}`);
      console.log(`- Active: ${activeAfter.length}`);
      
      await app.close();
    }, 2000);
    
  } catch (error) {
    console.error('Error testing queue:', error);
    await app.close();
  }
}

testQueue(); 