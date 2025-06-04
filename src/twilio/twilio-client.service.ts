import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { MessageListInstanceCreateOptions } from 'twilio/lib/rest/api/v2010/account/message';

@Injectable()
export class TwilioClientService {
  private readonly logger = new Logger(TwilioClientService.name);
  private readonly client: Twilio;
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly apiEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.apiEndpoint = this.configService.get<string>('BACKEND_URL') || '';

    if (!this.accountSid || !this.authToken) {
      this.logger.warn('Twilio credentials not found. SMS sending will be disabled.');
    }

    // Initialize Twilio client
    this.client = new Twilio(this.accountSid, this.authToken);
  }

  /**
   * Send SMS using Twilio API
   */
  async sendSms(options: {
    to: string;
    body: string;
    from?: string;
    messagingServiceSid?: string;
  }): Promise<{ sid: string; success: boolean; error?: string }> {
    try {
      if (!this.accountSid || !this.authToken) {
        throw new Error('Twilio credentials not configured');
      }

      const { to, body, from, messagingServiceSid } = options;

      // Validate phone number format
      if (!to.startsWith('+')) {
        throw new Error('Phone number must be in E.164 format (starting with +)');
      }

      // Prepare message options
      const messageOptions: MessageListInstanceCreateOptions = {
        body,
        to,
        statusCallback: `${this.apiEndpoint}/webhooks/twilio/status`,
      };

      // Use either from number or messaging service SID
      if (messagingServiceSid) {
        messageOptions.messagingServiceSid = messagingServiceSid;
      } else if (from) {
        messageOptions.from = from;
      } else {
        throw new Error('Either from number or messagingServiceSid must be provided');
      }

      this.logger.log(`Sending SMS to ${to} via Twilio`);

      // Send the message
      const message = await this.client.messages.create(messageOptions);

      this.logger.log(`SMS sent successfully with SID: ${message.sid}`);

      return {
        sid: message.sid,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      return {
        sid: '',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get message status from Twilio
   */
  async getMessageStatus(sid: string): Promise<{ status: string; error?: string }> {
    try {
      if (!this.accountSid || !this.authToken) {
        throw new Error('Twilio credentials not configured');
      }

      const message = await this.client.messages(sid).fetch();
      
      return {
        status: message.status,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch message status: ${error.message}`);
      return {
        status: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Check if Twilio is properly configured
   */
  isConfigured(): boolean {
    return !!(this.accountSid && this.authToken);
  }
} 