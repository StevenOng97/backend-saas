import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
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
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 2, // Keep only 2 completed jobs (minimal but not 0)
        removeOnFail: 2, // Keep only 2 failed jobs (minimal but not 0)
      },
    }),
    BullModule.registerQueue({
      name: 'google-my-business',
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 2, // Keep only 2 completed jobs (minimal but not 0)
        removeOnFail: 2, // Keep only 2 failed jobs (minimal but not 0)
      },
    }),

    ConfigModule,
    PrismaModule,
    TwilioModule,
  ],
  providers: [SmsProcessor, SmsService],
  exports: [
    // Export Bull queues and queue services so other modules can use them
    BullModule,
  ],
})
export class WorkersModule {}
