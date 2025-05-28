import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SmsService } from '../sms/sms.service';
import { SmsJobData, SmsJobResult } from '../types/sms-job.interface';

@Processor('sms')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly smsService: SmsService) {
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
    
    this.logger.log(`Processing SMS job ${job.id} for invite ${inviteId}`);
    
    try {
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
      
      this.logger.log(`SMS job ${job.id} completed successfully with SID: ${result.sid}`);
      return { sid: result.sid };
    } catch (error) {
      this.logger.error(`Error processing SMS job ${job.id}: ${error.message}`);
      throw error;
    }
  }
} 