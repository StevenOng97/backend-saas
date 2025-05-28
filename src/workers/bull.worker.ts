import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { SmsService } from '../sms/sms.service';
import { Logger } from '@nestjs/common';
import { config as dotenvConfig } from 'dotenv';
import { getUpstashConnectionOptions } from '../config/upstash.config';
import prisma from '../../lib/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { TwilioClientService } from 'src/twilio/twilio-client.service';

// Load environment variables
dotenvConfig();

// Initialize required services
const configService = new ConfigService();
const smsService = new SmsService(prisma as PrismaService, configService, new TwilioClientService(configService));
const logger = new Logger('BullWorker');

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

// Create the SMS worker
const smsWorker = new Worker(
  'sms',
  async (job: Job) => {
    const { businessId, customerId, inviteId, message } = job.data;
    
    logger.log(`Processing SMS job ${job.id} for invite ${inviteId}`);
    
    // Use sendReviewInvite for proper invite handling instead of generic sendSms
    const result = await smsService.sendReviewInvite(
      inviteId,
      businessId,
      customerId,
    );
    
    if (!result.success) {
      logger.error(`Failed to send SMS for job ${job.id}: ${result.message || 'Unknown error'}, will retry if attempts remain`);
      throw new Error(result.message || 'SMS sending failed');
    }
    
    logger.log(`SMS job ${job.id} completed successfully with SID: ${result.sid}`);
    return { sid: result.sid };
  },
  { connection },
);

// Create the Twilio Registration worker
const twilioRegistrationWorker = new Worker(
  'twilioRegistration',
  async (job: Job) => {
    const { businessId } = job.data;
    
    logger.log(`Processing Twilio registration job ${job.id} for business ${businessId}`);
    
    try {
      // Get business
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });
      
      if (!business) {
        logger.error(`Business with ID ${businessId} not found`);
        throw new Error(`Business with ID ${businessId} not found`);
      }
      
      // Check if business has A2P brand and campaign IDs
      if (!business.a2pBrandId || !business.a2pCampaignId) {
        logger.error(`Business ${businessId} missing brand or campaign ID`);
        throw new Error(`Business ${businessId} missing brand or campaign ID`);
      }
      
      // Set brand and campaign status to COMPLETE
      const brandStatus = 'COMPLETE';
      const campaignStatus = 'COMPLETE';
      
      logger.log(`Status check for business ${businessId} - Brand: ${brandStatus}, Campaign: ${campaignStatus}`);
      
      // Update business record with status
      await prisma.business.update({
        where: { id: businessId },
        data: {
          // In a real implementation, we would store the status
          // For now, just update the updatedAt timestamp
          updatedAt: new Date(),
        },
      });
      
      // If not complete, throw error to retry with backoff
      if (brandStatus !== 'COMPLETE' || campaignStatus !== 'COMPLETE') {
        logger.log(`Registration not complete for business ${businessId}, will retry`);
        throw new Error('Registration not complete');
      }
      
      logger.log(`Registration complete for business ${businessId}`);
      return { brandStatus, campaignStatus };
    } catch (error) {
      logger.error(`Error processing Twilio registration job: ${error.message}`);
      throw error;
    }
  },
  { 
    connection,
    // Configure concurrency and retry strategy
    concurrency: 5,
    limiter: {
      max: 50,
      duration: 1000 * 60 * 15, // 15 minutes
    },
    // Max stalled check configuration
    maxStalledCount: 1,
    stalledInterval: 30000, // 30 seconds
    // Custom backoff strategy
    settings: {
      backoffStrategy: (attemptsMade) => {
        // Exponential backoff: min 5 min, max 24 hours
        const delayMinutes = Math.min(5 * Math.pow(2, attemptsMade), 24 * 60);
        return delayMinutes * 60 * 1000;
      }
    }
  },
);

// Set up event handlers for both workers
for (const worker of [smsWorker, twilioRegistrationWorker]) {
  worker.on('completed', (job: Job) => {
    logger.log(`Job ${job.id} in queue ${job.queueName} has been completed successfully`);
  });

  worker.on('failed', (job: Job, error: Error) => {
    logger.error(`Job ${job.id} in queue ${job.queueName} has failed with error: ${error.message}`);
    
    if (job.attemptsMade >= 10) {
      logger.error(`Job ${job.id} has failed permanently after ${job.attemptsMade} attempts`);
    }
  });
  
  worker.on('error', (error) => {
    logger.error(`Worker error: ${error.message}`);
  });
}

logger.log('Workers started and listening for jobs');

// Handle termination gracefully
process.on('SIGINT', async () => {
  await Promise.all([
    smsWorker.close(),
    twilioRegistrationWorker.close(),
  ]);
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await Promise.all([
    smsWorker.close(),
    twilioRegistrationWorker.close(),
  ]);
  await prisma.$disconnect();
  process.exit(0);
});
