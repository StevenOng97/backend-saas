import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TwilioRegistrationWorker } from './twilio-registration.worker';
import { SmsProcessor } from './sms.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { TwilioModule } from '../twilio/twilio.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'twilioRegistration',
    }),
    BullModule.registerQueue({
      name: 'sms',
    }),
    PrismaModule,
    TwilioModule,
    SmsModule,
  ],
  providers: [TwilioRegistrationWorker, SmsProcessor],
})
export class WorkersModule {} 