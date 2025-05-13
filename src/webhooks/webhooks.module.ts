import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {} 