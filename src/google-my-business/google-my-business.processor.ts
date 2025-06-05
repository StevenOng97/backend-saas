import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { GoogleMyBusinessService } from './google-my-business.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ReviewMonitoringJob {
  businessId: string;
  organizationId: string;
}

@Processor('google-my-business')
export class GoogleMyBusinessProcessor {
  private readonly logger = new Logger(GoogleMyBusinessProcessor.name);

  constructor(
    private readonly googleMyBusinessService: GoogleMyBusinessService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('check-reviews')
  async handleReviewCheck(job: Job<ReviewMonitoringJob>) {
    const { businessId, organizationId } = job.data;
    
    try {
      this.logger.log(`Checking reviews for business ${businessId}`);
      
      const result = await this.googleMyBusinessService.checkForNewReviews(businessId);
      
      if (result.hasNewReviews) {
        this.logger.log(`Found ${result.newReviewsCount} new reviews for business ${businessId}`);
        
        // Here you could trigger notifications, emails, etc.
        // For example, send email notification to business owner
        await this.notifyBusinessOwner(businessId, result.newReviewsCount);
      }
      
      return { success: true, newReviewsCount: result.newReviewsCount };
    } catch (error) {
      this.logger.error(`Failed to check reviews for business ${businessId}: ${error.message}`);
      throw error;
    }
  }

  @Process('monitor-all-businesses')
  async handleMonitorAllBusinesses(job: Job) {
    try {
      this.logger.log('Starting review monitoring for all businesses');
      
      // Get all businesses that have Google data configured
      const businesses = await this.prisma.business.findMany({
        where: {
          OR: [
            { googleLocationId: { not: null } },
            { googlePlaceId: { not: null } },
            { googleBusinessReviewLink: { not: null } },
          ],
        },
        select: {
          id: true,
          organizationId: true,
          name: true,
        },
      });

      this.logger.log(`Found ${businesses.length} businesses to monitor`);

      // Process each business
      for (const business of businesses) {
        try {
          await this.googleMyBusinessService.checkForNewReviews(business.id);
          this.logger.log(`Successfully checked reviews for ${business.name}`);
        } catch (error) {
          this.logger.error(`Failed to check reviews for ${business.name}: ${error.message}`);
          // Continue with next business even if one fails
        }
      }

      return { success: true, businessesChecked: businesses.length };
    } catch (error) {
      this.logger.error(`Failed to monitor all businesses: ${error.message}`);
      throw error;
    }
  }

  private async notifyBusinessOwner(businessId: string, newReviewsCount: number) {
    try {
      // Get business owner information
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        include: {
          organization: {
            include: {
              users: {
                where: { role: 'ADMIN' },
                select: { email: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      if (!business || !business.organization.users.length) {
        this.logger.warn(`No admin users found for business ${businessId}`);
        return;
      }

      // Here you would typically send an email notification
      // For now, just log the notification
      this.logger.log(`Would notify business owner about ${newReviewsCount} new reviews for ${business.name}`);
      
      // TODO: Integrate with your email service to send actual notifications
      // Example:
      // await this.emailService.sendNewReviewNotification({
      //   to: business.organization.users[0].email,
      //   businessName: business.name,
      //   newReviewsCount,
      // });
      
    } catch (error) {
      this.logger.error(`Failed to notify business owner for business ${businessId}: ${error.message}`);
    }
  }
} 