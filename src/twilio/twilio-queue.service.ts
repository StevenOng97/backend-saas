import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class TwilioQueueService {
  // private readonly logger = new Logger(TwilioQueueService.name);

  // constructor(
  //   @InjectQueue('twilioRegistration') private twilioRegistrationQueue: Queue,
  // ) {}

  // /**
  //  * Queue a job to check the registration status of a business
  //  */
  // async queueRegistrationStatusCheck(
  //   businessId: string, 
  //   options: { delay?: number } = {}
  // ): Promise<void> {
  //   this.logger.log(`Queueing registration status check for business: ${businessId}`);
    
  //   const jobOptions = options.delay ? { delay: options.delay } : {};
    
  //   await this.twilioRegistrationQueue.add(
  //     'checkStatus',
  //     { businessId },
  //     jobOptions,
  //   );
    
  //   this.logger.log(`Registration status check queued for business: ${businessId}`);
  // }
  
  // /**
  //  * Queue scheduled status checks for the next 7 days with increasing intervals
  //  */
  // async queueScheduledStatusChecks(businessId: string): Promise<void> {
  //   this.logger.log(`Setting up scheduled status checks for business: ${businessId}`);
    
  //   // Schedule checks with increasing intervals
  //   const schedules = [
  //     { delay: 30 * 60 * 1000 },          // 30 minutes
  //     { delay: 2 * 60 * 60 * 1000 },      // 2 hours
  //     { delay: 6 * 60 * 60 * 1000 },      // 6 hours
  //     { delay: 12 * 60 * 60 * 1000 },     // 12 hours
  //     { delay: 24 * 60 * 60 * 1000 },     // 1 day
  //     { delay: 3 * 24 * 60 * 60 * 1000 }, // 3 days
  //     { delay: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  //   ];
    
  //   // Queue up all the scheduled checks
  //   for (const schedule of schedules) {
  //     await this.queueRegistrationStatusCheck(businessId, { delay: schedule.delay });
  //   }
    
  //   this.logger.log(`Scheduled ${schedules.length} status checks for business: ${businessId}`);
  // }
} 