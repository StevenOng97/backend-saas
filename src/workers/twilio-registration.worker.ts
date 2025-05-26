import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioIsvService } from '../twilio/twilio-isv.service';

@Processor('twilioRegistration')
export class TwilioRegistrationWorker {
  private readonly logger = new Logger(TwilioRegistrationWorker.name);

  constructor(
    private readonly twilioIsvService: TwilioIsvService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('checkStatus')
  async checkRegistrationStatus(job: Job<{ businessId: string }>): Promise<void> {
    const { businessId } = job.data;
    
    this.logger.log(`Processing registration status check for business ID: ${businessId}`);
    
    // Get business
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    
    if (!business) {
      this.logger.error(`Business with ID ${businessId} not found`);
      throw new Error(`Business with ID ${businessId} not found`);
    }
    
    // Check if business has A2P brand and campaign IDs
    if (!business.a2pBrandId || !business.a2pCampaignId) {
      this.logger.error(`Business ${businessId} missing brand or campaign ID`);
      throw new Error(`Business ${businessId} missing brand or campaign ID`);
    }
    
    // Check registration status
    const status = await this.twilioIsvService.checkRegistrationStatus(
      business.a2pBrandId,
      business.a2pCampaignId,
    );
    
    // Update business record with registration status
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        // Here we would update fields to track the registration status
        // This would depend on how you want to model this in your schema
        // For example, you might add a `twilioRegistrationStatus` field
        // For now, we're just updating the updatedAt field
        updatedAt: new Date(),
      },
    });
    
    // If not complete, requeue with exponential backoff
    if (status.brandStatus !== 'COMPLETE' || status.campaignStatus !== 'COMPLETE') {
      // Calculate delay with exponential backoff, minimum 5 mins, maximum 24 hours
      const delayMinutes = Math.min(5 * Math.pow(2, job.attemptsMade), 24 * 60);
      const delayMs = delayMinutes * 60 * 1000;
      
      this.logger.log(
        `Registration not complete. Retrying in ${delayMinutes} minutes. ` +
        `Brand: ${status.brandStatus}, Campaign: ${status.campaignStatus}`
      );
      
      // Add job back to queue with delay
      await this.addJobWithDelay(businessId, delayMs);
    } else {
      this.logger.log(`Registration complete for business ${businessId}`);
    }
  }
  
  /**
   * Helper method to add a job back to the queue with a delay
   */
  private async addJobWithDelay(businessId: string, delayMs: number): Promise<void> {
    // In a real implementation, you would use the Bull queue to add a new job
    // Since we're in a worker class, we don't have direct access to the queue
    // In a full implementation, you would inject the queue and use it here
    
    this.logger.log(`Would add job back to queue with ${delayMs}ms delay for business ${businessId}`);
    
    // This is a placeholder. In a real implementation, you would do:
    /*
    await this.twilioRegistrationQueue.add(
      'checkStatus', 
      { businessId }, 
      { delay: delayMs }
    );
    */
  }
} 