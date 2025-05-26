import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SmsStatus } from '@prisma/client';
import { UrlShortenerService } from '../url-shortener/url-shortener.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly sharedTwilioNumber: string;
  private readonly sharedServiceSid: string;
  private readonly sharedA2pBrandId: string;
  private readonly sharedA2pCampaignId: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private urlShortenerService: UrlShortenerService,
  ) {
    this.sharedTwilioNumber = this.configService.get<string>('SHARED_TWILIO_NUMBER') || '';
    this.sharedServiceSid = this.configService.get<string>('SHARED_SERVICE_SID') || '';
    this.sharedA2pBrandId = this.configService.get<string>('SHARED_A2P_BRAND_ID') || '';
    this.sharedA2pCampaignId = this.configService.get<string>('SHARED_A2P_CAMPAIGN_ID') || '';
  }

  /**
   * Send a review invitation SMS
   */
  async sendReviewInvite(
    inviteId: string,
    businessId: string,
    customerId: string,
  ): Promise<{ sid: string; success: boolean; message?: string }> {
    try {
      // Get the business, customer, and invite details
      const [business, customer, invite] = await Promise.all([
        this.prisma.business.findUnique({ where: { id: businessId } }),
        this.prisma.customer.findUnique({ where: { id: customerId } }),
        this.prisma.invite.findUnique({ where: { id: inviteId } }),
      ]);

      if (!business || !customer || !invite) {
        return { 
          sid: '', 
          success: false,
          message: 'Business, customer, or invite not found'
        };
      }

      // Check if customer opted out
      if (customer.optedOut) {
        // Create a failed SMS log for tracking
        const sid = `SM${crypto.randomBytes(15).toString('hex')}`;
        await this.prisma.smsLog.create({
          data: {
            businessId,
            customerId,
            inviteId,
            twilioSid: sid,
            status: SmsStatus.FAILED,
            message: 'Customer opted out',
          },
        });
        
        return { 
          sid, 
          success: false,
          message: 'Customer opted out'
        };
      }

      // Generate a short URL for the review link
      const shortUrlMapping = await this.urlShortenerService.createShortUrl(
        `${this.configService.get<string>('BACKEND_URL')}/rate/${inviteId}`
      );

      let fromNumber: string;
      let messagingServiceSid: string;
      let smsBody: string;

      // Determine which sender configuration to use
      if (business.senderType === 'shared') {
        fromNumber = this.sharedTwilioNumber;
        messagingServiceSid = this.sharedServiceSid;
        
        // Locked template with business name merge field for shared senders
        smsBody = `Hi ${customer.name || 'there'}! How was your experience with ${business.name} today: ${shortUrlMapping.shortUrl} Reply STOP to opt out.`;
      } else {
        // For dedicated senders
        fromNumber = business.senderPhone || '';
        messagingServiceSid = business.a2pCampaignId || '';
        
        // Custom template for dedicated senders
        if (business.smsTemplate) {
          smsBody = this.renderCustomTemplate(
            business.smsTemplate,
            customer,
            business,
            shortUrlMapping.shortUrl
          );
        } else {
          smsBody = `Hi ${customer.name || 'there'}! How was your experience with ${business.name} today: ${shortUrlMapping.shortUrl} Reply STOP to opt out.`;
        }
      }

      // Simulate sending SMS via Twilio
      const result = await this.sendSms(
        businessId,
        customerId,
        smsBody,
        inviteId,
        fromNumber,
        messagingServiceSid
      );

      return result;
    } catch (error) {
      this.logger.error(`Error sending review invite: ${error.message}`);
      return { 
        sid: '', 
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Simulate sending an SMS via Twilio
   */
  async sendSms(
    businessId: string,
    customerId: string,
    message: string,
    inviteId?: string,
    fromNumber?: string,
    messagingServiceSid?: string,
  ): Promise<{ sid: string; success: boolean }> {
    // Simulate success/failure (70% success rate)
    const isSuccess = Math.random() < 0.7;
    
    // Generate a fake Twilio SID
    const sid = `SM${crypto.randomBytes(15).toString('hex')}`;
    
    this.logger.log(
      `Attempting to send SMS to customer ${customerId} from ${fromNumber || 'shared number'}: ${isSuccess ? 'SUCCESS' : 'FAILURE'}`,
    );

    if (isSuccess) {
      // Create a record in the sms_logs table
      await this.prisma.smsLog.create({
        data: {
          businessId,
          customerId,
          inviteId,
          twilioSid: sid,
          status: SmsStatus.QUEUED,
          message,
        },
      });

      this.logger.log(`SMS queued with SID: ${sid}`);
      return { sid, success: true };
    }

    this.logger.error(`Failed to send SMS to customer ${customerId}`);
    return { sid, success: false };
  }

  /**
   * Update SMS status based on webhook data
   */
  async updateSmsStatus(sid: string, status: SmsStatus): Promise<boolean> {
    try {
      const smsLog = await this.prisma.smsLog.findFirst({
        where: { twilioSid: sid },
      });

      if (!smsLog) {
        this.logger.error(`SMS log with SID ${sid} not found`);
        return false;
      }

      await this.prisma.smsLog.update({
        where: { id: smsLog.id },
        data: { status, updatedAt: new Date() },
      });

      this.logger.log(`Updated SMS status for SID ${sid} to ${status}`);
      return true;
    } catch (error) {
      this.logger.error(`Error updating SMS status: ${error.message}`);
      return false;
    }
  }

  /**
   * Mark a customer as opted out
   */
  async markCustomerAsOptedOut(phoneNumber: string): Promise<boolean> {
    try {
      const customers = await this.prisma.customer.findMany({
        where: { phone: phoneNumber },
      });

      if (!customers || customers.length === 0) {
        this.logger.warn(`No customers found with phone ${phoneNumber}`);
        return false;
      }

      // Update all customers with this phone number
      await this.prisma.customer.updateMany({
        where: { phone: phoneNumber },
        data: { optedOut: true },
      });

      this.logger.log(`Marked ${customers.length} customer(s) with phone ${phoneNumber} as opted out`);
      return true;
    } catch (error) {
      this.logger.error(`Error marking customer as opted out: ${error.message}`);
      return false;
    }
  }

  /**
   * Render a custom SMS template with variables
   */
  private renderCustomTemplate(
    template: string,
    customer: { name?: string | null },
    business: { name: string },
    reviewLink: string
  ): string {
    // Replace template variables with actual values
    return template
      .replace(/{customer_name}/g, customer.name || 'there')
      .replace(/{business_name}/g, business.name)
      .replace(/{review_link}/g, reviewLink);
  }
} 