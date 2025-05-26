import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioIsvService } from '../twilio/twilio-isv.service';
import { TwilioQueueService } from '../twilio/twilio-queue.service';
import { SubscriptionPlan } from '@prisma/client';

@Injectable()
export class UpgradeService {
  private readonly logger = new Logger(UpgradeService.name);
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly twilioIsvService: TwilioIsvService,
    private readonly twilioQueueService: TwilioQueueService,
  ) {}
  
  /**
   * Upgrade an organization's subscription to the PRO plan
   */
  async upgradeToGrowth(organizationId: string): Promise<any> {
    this.logger.log(`Upgrading organization ${organizationId} to GROWTH plan`);
    
    // Use a transaction to ensure all operations succeed or fail together
    return this.prisma.$transaction(async (tx) => {
      // 1. Update subscription plan
      const subscription = await tx.subscription.update({
        where: { organizationId },
        data: { 
          plan: SubscriptionPlan.PRO,
          // Update other subscription fields like inviteLimit, etc.
        },
      });
      
      // 2. Get all businesses for this organization
      const businesses = await tx.business.findMany({
        where: { organizationId },
      });
      
      // 3. For each business, provision dedicated resources
      for (const business of businesses) {
        // Skip if already has dedicated resources
        if (business.senderType === 'dedicated') {
          this.logger.log(`Business ${business.id} already has dedicated resources, skipping`);
          continue;
        }
        
        // Provision dedicated resources
        await this.provisionDedicatedResources(tx, business);
      }
      
      this.logger.log(`Successfully upgraded organization ${organizationId} to GROWTH plan`);
      return subscription;
    });
  }
  
  /**
   * Provision dedicated resources for a business
   */
  private async provisionDedicatedResources(
    tx: any,
    business: any,
  ): Promise<void> {
    try {
      this.logger.log(`Provisioning dedicated resources for business ${business.id}`);
      
      // 1. Register brand via Twilio ISV API
      const brandId = await this.twilioIsvService.registerBrand(business);
      
      // 2. Register campaign
      const campaignId = await this.twilioIsvService.registerCampaign(business, brandId);
      
      // 3. Provision phone number
      const phoneNumber = await this.twilioIsvService.provisionPhoneNumber(business);
      
      // 4. Update business record
      await tx.business.update({
        where: { id: business.id },
        data: {
          senderType: 'dedicated',
          senderPhone: phoneNumber,
          a2pBrandId: brandId,
          a2pCampaignId: campaignId,
          smsTemplate: this.getDefaultTemplate(business),
        },
      });
      
      // 5. Schedule registration status checks
      // The transaction hasn't committed yet, so we'll need to queue these after commit
      // For now, just log that we would queue them
      this.logger.log(`Would queue registration status checks for business ${business.id}`);
      
      // In a real implementation, you would queue the status checks after the transaction commits
      // or use a post-commit hook provided by your transaction library
    } catch (error) {
      this.logger.error(`Failed to provision dedicated resources: ${error.message}`);
      throw error; // Re-throw to roll back the transaction
    }
  }
  
  /**
   * Get default SMS template for a business
   */
  private getDefaultTemplate(business: any): string {
    return `Hi {customer_name}, how was your experience with ${business.name} today? {review_link} Reply STOP to opt out.`;
  }
} 