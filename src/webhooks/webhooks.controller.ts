import { Controller, Post, Body, HttpStatus, Logger } from '@nestjs/common';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';
import { SmsService } from '../sms/sms.service';
import { SmsStatus } from '@prisma/client';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

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

  @Post('twilio/opt-out')
  async handleOptOut(@Body() body: { From: string; Body: string }) {
    this.logger.log(`Received opt-out request from ${body.From}: ${body.Body}`);
    
    // Check if this is an opt-out message (containing STOP, CANCEL, etc.)
    const optOutKeywords = ['STOP', 'CANCEL', 'UNSUBSCRIBE', 'END', 'QUIT'];
    
    const messageBody = body.Body?.trim().toUpperCase() || '';
    if (!optOutKeywords.some(keyword => messageBody.includes(keyword))) {
      this.logger.log(`Message "${messageBody}" is not an opt-out request`);
      return {
        status: HttpStatus.OK,
        message: 'Not an opt-out message',
      };
    }
    
    // Mark the customer as opted out
    const success = await this.smsService.markCustomerAsOptedOut(body.From);
    
    if (!success) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: `No customer found with phone number ${body.From}`,
      };
    }
    
    return {
      status: HttpStatus.OK,
      message: `Successfully opted out customer with phone number ${body.From}`,
    };
  }
} 