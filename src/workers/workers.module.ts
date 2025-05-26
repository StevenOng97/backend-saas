import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TwilioRegistrationWorker } from './twilio-registration.worker';
import { PrismaModule } from '../prisma/prisma.module';
import { TwilioModule } from '../twilio/twilio.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'twilioRegistration',
    }),
    PrismaModule,
    TwilioModule,
  ],
  providers: [TwilioRegistrationWorker],
})
export class WorkersModule {} 