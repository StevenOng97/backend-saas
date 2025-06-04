import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
// import { TwilioRegistrationWorker } from './twilio-registration.worker';
import { SmsProcessor } from './sms.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { TwilioModule } from '../twilio/twilio.module';
import { SmsService } from '../sms/sms.service';
// import { TwilioQueueService } from '../twilio/twilio-queue.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // Centralized queue registrations - single source of truth
    BullModule.registerQueue({
      name: 'sms',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 2,    // Keep only 2 completed jobs (minimal but not 0)
        removeOnFail: 2,       // Keep only 2 failed jobs (minimal but not 0)
      },
      // Conservative settings to reduce Redis polling
      settings: {
        stalledInterval: 60000,    // Check for stalled jobs every 60 seconds (vs 30s default)
        maxStalledCount: 1,        // Reduce stalled job checks
      },
    }),
    // BullModule.registerQueue({
    //   name: 'twilioRegistration',
    //   defaultJobOptions: {
    //     attempts: 5,
    //     backoff: {
    //       type: 'exponential',
    //       delay: 10000,
    //     },
    //     removeOnComplete: 5,
    //     removeOnFail: 3,
    //   },
    // }),
    // Dependencies
    ConfigModule,
    PrismaModule,
    TwilioModule,
  ],
  providers: [SmsProcessor, SmsService],
  exports: [
    // Export Bull queues and queue services so other modules can use them
    BullModule,
    // TwilioQueueService,
  ],
})
export class WorkersModule {}
