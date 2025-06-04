import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SmsService } from '../sms/sms.service';
import { SmsJobData, SmsJobResult } from '../types/sms-job.interface';
import { PrismaService } from '../prisma/prisma.service';

@Processor('sms')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly prisma: PrismaService
  ) {
    this.logger.log('SmsProcessor initialized and ready to process jobs');
  }

  @OnQueueActive()
  onActive(job: Job<SmsJobData>) {
    this.logger.log(`Processing job ${job.id} of type ${job.name} with data: ${JSON.stringify(job.data)}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<SmsJobData>, result: SmsJobResult) {
    this.logger.log(`Job ${job.id} completed successfully with result: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onFailed(job: Job<SmsJobData>, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`);
  }

  @Process('send')
  async handleSendInvite(job: Job<SmsJobData>): Promise<SmsJobResult> {
    const { businessId, customerId, inviteId } = job.data;
    
    this.logger.log(`Processing SMS job ${job.id} for invite ${inviteId}${job.opts.delay ? ` (was scheduled)` : ''}`);
    
    try {
      // Check if this invite has a specific send time and if we're sending at the right time
      const invite = await this.prisma.invite.findUnique({
        where: { id: inviteId },
        select: { sendAt: true, status: true, shortId: true },
      });

      if (invite?.sendAt) {
        const now = new Date();
        const scheduledTime = new Date(invite.sendAt);
        
        // Allow 5 minute window before scheduled time (in case job was processed early)
        const earlyWindow = new Date(scheduledTime.getTime() - 5 * 60 * 1000);
        
        if (now < earlyWindow) {
          this.logger.warn(`Job ${job.id} processed too early. Scheduled for ${scheduledTime.toISOString()}, current time: ${now.toISOString()}`);
          // Re-queue the job for the correct time
          const newDelay = scheduledTime.getTime() - now.getTime();
          throw new Error(`Rescheduling: too early by ${Math.round((earlyWindow.getTime() - now.getTime()) / 1000 / 60)} minutes`);
        }

        this.logger.log(`Processing scheduled SMS for invite ${inviteId} ${invite?.shortId ? `(shortId: ${invite.shortId})` : ''}. Scheduled: ${scheduledTime.toISOString()}, Actual: ${now.toISOString()}`);
      }

      // Use sendReviewInvite for proper invite handling
      const result = await this.smsService.sendReviewInvite(
        inviteId,
        businessId,
        customerId,
      );
      
      if (!result.success) {
        this.logger.error(`Failed to send SMS for job ${job.id}: ${result.message || 'Unknown error'}`);
        throw new Error(result.message || 'SMS sending failed');
      }
      
      this.logger.log(`SMS job ${job.id} completed successfully with SID: ${result.sid}${invite?.sendAt ? ' (scheduled send)' : ''}`);
      return { sid: result.sid };
    } catch (error) {
      this.logger.error(`Error processing SMS job ${job.id}: ${error.message}`);
      throw error;
    }
  }
} 