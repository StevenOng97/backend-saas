import { Module } from '@nestjs/common';
import { TwilioClientService } from './twilio-client.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
  ],
  providers: [TwilioClientService],
  exports: [TwilioClientService],
})
export class TwilioModule {} 