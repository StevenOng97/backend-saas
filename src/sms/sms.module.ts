import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { TwilioModule } from '../twilio/twilio.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    TwilioModule,
  ],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {} 