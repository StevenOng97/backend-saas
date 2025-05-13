import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { SmsStatus } from '@prisma/client';
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Simulate sending an SMS via Twilio
   */
  async sendSms(
    businessId: string,
    customerId: string,
    message: string,
    inviteId?: string,
  ): Promise<{ sid: string; success: boolean }> {
    // Simulate success/failure (70% success rate)
    const isSuccess = Math.random() < 0.7;
    
    // Generate a fake Twilio SID
    const sid = `SM${crypto.randomBytes(15).toString('hex')}`;
    
    this.logger.log(
      `Attempting to send SMS to customer ${customerId}: ${isSuccess ? 'SUCCESS' : 'FAILURE'}`,
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
} 