import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TwilioRegistrationWorker } from './twilio-registration.worker';
import { SmsProcessor } from './sms.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { TwilioModule } from '../twilio/twilio.module';
import { SmsModule } from '../sms/sms.module';
import { TwilioQueueService } from '../twilio/twilio-queue.service';
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
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    }),
    BullModule.registerQueue({
      name: 'twilioRegistration',
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: 5,
        removeOnFail: 3,
      },
    }),
    // Dependencies
    ConfigModule,
    PrismaModule,
    TwilioModule,
    SmsModule,
  ],
  providers: [TwilioRegistrationWorker, SmsProcessor, TwilioQueueService],
  exports: [
    // Export Bull queues and queue services so other modules can use them
    BullModule,
    TwilioQueueService,
  ],
})
export class WorkersModule {} 