import { Module } from '@nestjs/common';
import { TwilioIsvService } from './twilio-isv.service';
import { TwilioQueueService } from './twilio-queue.service';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'twilioRegistration',
    }),
  ],
  providers: [TwilioIsvService, TwilioQueueService],
  exports: [TwilioIsvService, TwilioQueueService],
})
export class TwilioModule {} 