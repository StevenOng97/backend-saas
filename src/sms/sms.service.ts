import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TwilioClientService } from '../twilio/twilio-client.service';
import { CustomerStatus, SmsStatus, TemplateType } from '@prisma/client';
import { TWILIO_ERROR_CODES } from '../../constants';
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
    private twilioClient: TwilioClientService,
  ) {
    this.sharedTwilioNumber =
      this.configService.get<string>('SHARED_TWILIO_NUMBER') || '';
    this.sharedServiceSid =
      this.configService.get<string>('SHARED_SERVICE_SID') || '';
    this.sharedA2pBrandId =
      this.configService.get<string>('SHARED_A2P_BRAND_ID') || '';
    this.sharedA2pCampaignId =
      this.configService.get<string>('SHARED_A2P_CAMPAIGN_ID') || '';
  }

  /**
   * Send a review invitation SMS
   */
  async sendReviewInvite(
    inviteId: string,
    businessId: string,
    customerId: string,
    templateId?: string,
  ): Promise<{ sid: string; success: boolean; message?: string }> {
    try {
      // Get the business, customer, and invite details
      const [business, customer, invite] = await Promise.all([
        this.prisma.business.findUnique({ where: { id: businessId } }),
        this.prisma.customer.findUnique({ where: { id: customerId } }),
        this.prisma.invite.findUnique({
          where: { id: inviteId },
          select: { id: true, shortId: true },
        }),
      ]);

      if (!business || !customer || !invite) {
        return {
          sid: '',
          success: false,
          message: 'Business, customer, or invite not found',
        };
      }

      let defaultTemplate;
      if (!templateId) {
        defaultTemplate = await this.prisma.template.findFirst({
          where: {
            businessId,
            type: TemplateType.SMS,
            isDefault: true,
          },
        });
      } else {
        defaultTemplate = await this.prisma.template.findUnique({
          where: { id: templateId },
        });
      }

      // Update the invite with the default template
      if (!templateId && defaultTemplate) {
        await this.prisma.invite.update({
          where: { id: inviteId },
          data: {
            templateId: defaultTemplate.id,
          },
        });
      }

      // Check if customer opted out
      if (customer.optedOut) {
        // Create a failed SMS log for tracking
        const sid = `SM_OPTED_OUT_${Date.now()}`;
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
          message: 'Customer opted out',
        };
      }

      // Validate customer phone number
      if (!customer.phone) {
        return {
          sid: '',
          success: false,
          message: 'Customer phone number not found',
        };
      }

      // Use shortId in the URL if available, otherwise fall back to full inviteId
      const inviteUrl = `${this.configService.get<string>('FRONTEND_URL')}/rate/${invite.shortId || invite.id}`;

      let fromNumber: string;
      let messagingServiceSid: string;
      let smsBody: string = '';

      let defaultTemplateBody = `Hi ${customer.name || 'there'}! How was your experience with ${business.name} today: ${inviteUrl} Reply STOP to opt out.`;
      if (defaultTemplate && defaultTemplate.content) {
        defaultTemplateBody = defaultTemplate.content
          .replace(/{customer_name}/g, customer.name || 'there')
          .replace(/{review_link}/g, inviteUrl);
      }

      fromNumber = this.sharedTwilioNumber;
      messagingServiceSid = this.sharedServiceSid;
      smsBody = defaultTemplateBody;

      // Send SMS via Twilio
      const result = await this.sendSms(
        businessId,
        customerId,
        customer.phone,
        smsBody,
        inviteId,
        fromNumber,
        messagingServiceSid,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error sending review invite: ${error.message}`);
      return {
        sid: '',
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Send an SMS via Twilio
   */
  async sendSms(
    businessId: string,
    customerId: string,
    phoneNumber: string,
    message: string,
    inviteId?: string,
    fromNumber?: string,
    messagingServiceSid?: string,
  ): Promise<{ sid: string; success: boolean; message?: string }> {
    try {
      // Ensure phone number is in E.164 format
      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('+')) {
        // Assume US number if no country code
        formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`;
      }

      this.logger.log(
        `Sending SMS to ${formattedPhone} from ${fromNumber || messagingServiceSid || 'default'}`,
      );

      // Send via Twilio
      const result = await this.twilioClient.sendSms({
        to: formattedPhone,
        body: message,
        from: fromNumber,
        messagingServiceSid: messagingServiceSid,
      });

      if (result.success) {
        // Create a record in the sms_logs table
        await this.prisma.smsLog.create({
          data: {
            businessId,
            customerId,
            inviteId,
            twilioSid: result.sid,
            status: SmsStatus.QUEUED,
            message,
          },
        });

        this.logger.log(`SMS sent successfully with SID: ${result.sid}`);
        return {
          sid: result.sid,
          success: true,
        };
      } else {
        // Log failed attempt
        await this.prisma.smsLog.create({
          data: {
            businessId,
            customerId,
            inviteId,
            twilioSid: result.sid || `FAILED_${Date.now()}`,
            status: SmsStatus.FAILED,
            message: result.error || 'Unknown error',
          },
        });

        this.logger.error(`Failed to send SMS: ${result.error}`);
        return {
          sid: result.sid || '',
          success: false,
          message: result.error,
        };
      }
    } catch (error) {
      this.logger.error(`Error sending SMS: ${error.message}`);

      // Log failed attempt
      await this.prisma.smsLog.create({
        data: {
          businessId,
          customerId,
          inviteId,
          twilioSid: `ERROR_${Date.now()}`,
          status: SmsStatus.FAILED,
          message: error.message,
        },
      });

      return {
        sid: '',
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Update SMS status based on webhook data
   */
  async updateSmsStatus(
    sid: string,
    status: SmsStatus,
    errorCode?: string,
  ): Promise<boolean> {
    try {
      const smsLog = await this.prisma.smsLog.findFirst({
        where: { twilioSid: sid },
      });

      if (!smsLog) {
        this.logger.error(`SMS log with SID ${sid} not found`);
        return false;
      }

      const updateData: any = { status, updatedAt: new Date() };

      if (errorCode) {
        const errorMessage = TWILIO_ERROR_CODES[errorCode];
        updateData.message = errorMessage || 'Unknown error occurred';
        updateData.status = SmsStatus.FAILED;
      } else {
        updateData.status = SmsStatus.DELIVERED;
      }

      await this.prisma.smsLog.update({
        where: { id: smsLog.id },
        data: updateData,
      });

      if (updateData.status === SmsStatus.DELIVERED) {
        await this.prisma.customer.update({
          where: { id: smsLog.customerId },
          data: { status: CustomerStatus.REQUEST_SENT },
        });
      }

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

      this.logger.log(
        `Marked ${customers.length} customer(s) with phone ${phoneNumber} as opted out`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error marking customer as opted out: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Mark a customer as opted in (reverse of opt-out)
   */
  async markCustomerAsOptedIn(phoneNumber: string): Promise<boolean> {
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
        data: { optedOut: false },
      });

      this.logger.log(
        `Marked ${customers.length} customer(s) with phone ${phoneNumber} as opted in`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Error marking customer as opted in: ${error.message}`);
      return false;
    }
  }
}
