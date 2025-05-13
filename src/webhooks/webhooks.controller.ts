import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';
import { SmsService } from '../sms/sms.service';
import { SmsStatus } from '@prisma/client';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly smsService: SmsService) {}

  @Post('twilio')
  async twilioWebhook(@Body() webhookData: TwilioWebhookDto) {
    const { sid, status } = webhookData;
    
    // Validate that the status is a valid SmsStatus enum value
    const validStatuses = Object.values(SmsStatus);
    if (!validStatuses.includes(status as SmsStatus)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: `Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`,
      };
    }

    const updated = await this.smsService.updateSmsStatus(sid, status as SmsStatus);
    
    if (!updated) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: `SMS with SID ${sid} not found`,
      };
    }
    
    return {
      status: HttpStatus.OK,
      message: `Successfully updated SMS status to ${status}`,
    };
  }
} 