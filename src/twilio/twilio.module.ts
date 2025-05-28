import { Module, forwardRef } from '@nestjs/common';
import { TwilioIsvService } from './twilio-isv.service';
import { TwilioClientService } from './twilio-client.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
  ],
  providers: [TwilioIsvService, TwilioClientService],
  exports: [TwilioIsvService, TwilioClientService],
})
export class TwilioModule {} 