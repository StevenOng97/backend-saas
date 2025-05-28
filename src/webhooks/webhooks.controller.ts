import { Controller, Post, Body, HttpStatus, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';
import { TwilioIncomingSmsDto } from './dto/twilio-incoming-sms.dto';
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

  @Post('twilio/incoming')
  async handleIncomingSms(@Body() incomingData: TwilioIncomingSmsDto, @Res() res: Response) {
    const { From, Body: messageBody, MessageSid } = incomingData;
    
    this.logger.log(`Received SMS from ${From}: "${messageBody}" (SID: ${MessageSid})`);
    
    const normalizedBody = messageBody?.trim().toUpperCase() || '';
    
    // Handle STOP keyword for opt-out
    if (normalizedBody === 'STOP') {
      this.logger.log(`Processing STOP request from ${From}`);
      
      const success = await this.smsService.markCustomerAsOptedOut(From);
      
      if (success) {
        this.logger.log(`Successfully opted out customer with phone ${From}`);
        // Respond with confirmation message (Twilio will send this as SMS)
        return res.type('text/xml').send(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Message>You have been unsubscribed from our SMS messages. Reply START to opt back in.</Message>
          </Response>
        `);
      } else {
        this.logger.warn(`Could not find customer with phone ${From} to opt out`);
        // Still respond with confirmation for privacy
        return res.type('text/xml').send(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Message>You have been unsubscribed from our SMS messages.</Message>
          </Response>
        `);
      }
    }
    
    // Handle HELP keyword
    if (normalizedBody === 'HELP') {
      this.logger.log(`Processing HELP request from ${From}`);
      
      return res.type('text/xml').send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>Reply STOP to unsubscribe from SMS messages. For support, contact us at support@yourcompany.com</Message>
        </Response>
      `);
    }
    
    // Handle START keyword (opt back in)
    if (normalizedBody === 'START') {
      this.logger.log(`Processing START request from ${From}`);
      
      const success = await this.smsService.markCustomerAsOptedIn(From);
      
      if (success) {
        this.logger.log(`Successfully opted in customer with phone ${From}`);
        return res.type('text/xml').send(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Message>You have been subscribed to our SMS messages. Reply STOP to unsubscribe.</Message>
          </Response>
        `);
      } else {
        this.logger.warn(`Could not find customer with phone ${From} to opt in`);
        return res.type('text/xml').send(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Message>You have been subscribed to our SMS messages.</Message>
          </Response>
        `);
      }
    }
    
    // For any other message, just acknowledge receipt
    this.logger.log(`Received unhandled message from ${From}: "${messageBody}"`);
    
    // Return empty response (no auto-reply for other messages)
    return res.type('text/xml').send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response></Response>
    `);
  }
} 