import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { SmsService } from '../sms/sms.service';
import { Logger } from '@nestjs/common';
import { config as dotenvConfig } from 'dotenv';
import { getUpstashConnectionOptions } from '../config/upstash.config';
import prisma from '../../lib/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
// Load environment variables
dotenvConfig();

// Initialize required services
const configService = new ConfigService();
const smsService = new SmsService(prisma as PrismaService);
const logger = new Logger('SmsWorker');

// Determine which Redis connection to use
let connection: any;

if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
  // Use Upstash Redis
  logger.log('Using Upstash Redis for the worker');
  connection = getUpstashConnectionOptions();
} else {
  // Use local Redis as fallback
  logger.log('Using local Redis for the worker');
  connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };
}

// Create the worker
const worker = new Worker(
  'sms',
  async (job: Job) => {
    const { businessId, customerId, inviteId, message } = job.data;
    
    logger.log(`Processing SMS job ${job.id} for invite ${inviteId}`);
    
    // Simulate sending the SMS
    const result = await smsService.sendSms(
      businessId,
      customerId,
      message,
      inviteId,
    );
    
    if (!result.success) {
      logger.error(`Failed to send SMS for job ${job.id}, will retry if attempts remain`);
      throw new Error('SMS sending failed');
    }
    
    logger.log(`SMS job ${job.id} completed successfully with SID: ${result.sid}`);
    return { sid: result.sid };
  },
  { connection },
);

worker.on('completed', (job: Job) => {
  logger.log(`Job ${job.id} has been completed successfully`);
});

worker.on('failed', (job: Job, error: Error) => {
  logger.error(`Job ${job.id} has failed with error: ${error.message}`);
  
  if (job.attemptsMade >= 3) {
    logger.error(`Job ${job.id} has failed permanently after ${job.attemptsMade} attempts`);
  }
});

logger.log('SMS Worker started and listening for jobs');

// Handle termination gracefully
process.on('SIGINT', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
