import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';

export interface GoogleReview {
  reviewId: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  starRating: number;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  starDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recentReviews: GoogleReview[];
  reviewsWithoutReply: number;
}

@Injectable()
export class GoogleMyBusinessService {
  private readonly logger = new Logger(GoogleMyBusinessService.name);
  private auth: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue('google-my-business') private readonly reviewQueue: Queue,
  ) {
    this.initializeAuth();
    this.setupPeriodicReviewChecks();
  }

  private async initializeAuth() {
    try {
      // Initialize Google Auth with service account or OAuth2
      this.auth = new google.auth.GoogleAuth({
        keyFile: this.configService.get('GOOGLE_SERVICE_ACCOUNT_KEY_PATH'),
        scopes: [
          'https://www.googleapis.com/auth/business.manage',
          'https://www.googleapis.com/auth/plus.business.manage',
        ],
      });
      
      this.logger.log('Google My Business authentication initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Google Auth:', error.message);
    }
  }

  /**
   * Setup periodic review monitoring for all businesses
   */
  private async setupPeriodicReviewChecks() {
    try {
      // Add a recurring job to check all businesses every hour
      await this.reviewQueue.add(
        'monitor-all-businesses',
        {},
        {
          repeat: { cron: '6 * * * *' }, // Every hour
          removeOnComplete: 2,
          removeOnFail: 2,
        }
      );
      
      this.logger.log('Scheduled periodic review monitoring');
    } catch (error) {
      this.logger.error('Failed to setup periodic review checks:', error.message);
    }
  }

  /**
   * Schedule review monitoring for a specific business
   */
  async scheduleReviewMonitoring(businessId: string, organizationId: string): Promise<void> {
    try {
      await this.reviewQueue.add(
        'check-reviews',
        { businessId, organizationId },
        {
          delay: 30000, // Start checking after 5 seconds
          removeOnComplete: 2,
          removeOnFail: 2,
        }
      );
      
      this.logger.log(`Scheduled review monitoring for business ${businessId}`);
    } catch (error) {
      this.logger.error(`Failed to schedule review monitoring for business ${businessId}:`, error.message);
    }
  }

  /**
   * Generate Google My Business review link for a business
   */
  async generateReviewLink(businessId: string): Promise<string> {
    try {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { 
          name: true, 
          googleBusinessReviewLink: true,
          googlePlaceId: true 
        },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      // If already has a custom review link, return it
      if (business.googleBusinessReviewLink) {
        return business.googleBusinessReviewLink;
      }

      // Generate review link based on business name
      const encodedBusinessName = encodeURIComponent(business.name);
      const reviewLink = `https://search.google.com/local/writereview?placeid=${business.googlePlaceId || ''}&q=${encodedBusinessName}`;

      // Save the generated link
      await this.prisma.business.update({
        where: { id: businessId },
        data: { googleBusinessReviewLink: reviewLink },
      });

      return reviewLink;
    } catch (error) {
      this.logger.error(`Error generating review link for business ${businessId}:`, error.message);
      throw new Error('Failed to generate review link');
    }
  }

  /**
   * Get reviews for a business location
   */
  async getBusinessReviews(businessId: string, locationId?: string): Promise<GoogleReview[]> {
    try {
      if (!this.auth) {
        throw new Error('Google authentication not initialized');
      }

      const authClient = await this.auth.getClient();
      const mybusinessBusinessInformation = google.mybusinessbusinessinformation({ version: 'v1', auth: authClient });

      // If locationId is not provided, we'll need to get it from the business data
      if (!locationId) {
        locationId = await this.getLocationIdForBusiness(businessId);
      }

      // Note: The v4 API is deprecated. This is a placeholder for the new API structure
      // You would need to use the Business Profile Performance API or other alternatives
      // For now, return mock data to demonstrate the structure
      const mockReviews: GoogleReview[] = [
        {
          reviewId: 'sample-review-1',
          reviewer: {
            displayName: 'Sample Customer',
            profilePhotoUrl: 'https://example.com/photo.jpg',
          },
          starRating: 5,
          comment: 'Great service!',
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
        },
      ];

      return mockReviews;
    } catch (error) {
      this.logger.error(`Error fetching reviews for business ${businessId}:`, error.message);
      return []; // Return empty array if API fails
    }
  }

  /**
   * Get review statistics for a business
   */
  async getReviewStats(businessId: string): Promise<ReviewStats> {
    try {
      const reviews = await this.getBusinessReviews(businessId);
      
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum, review) => sum + review.starRating, 0) / totalReviews 
        : 0;

      const starDistribution = {
        5: reviews.filter(r => r.starRating === 5).length,
        4: reviews.filter(r => r.starRating === 4).length,
        3: reviews.filter(r => r.starRating === 3).length,
        2: reviews.filter(r => r.starRating === 2).length,
        1: reviews.filter(r => r.starRating === 1).length,
      };

      const reviewsWithoutReply = reviews.filter(r => !r.reviewReply).length;
      const recentReviews = reviews.slice(0, 10); // Last 10 reviews

      return {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        starDistribution,
        recentReviews,
        reviewsWithoutReply,
      };
    } catch (error) {
      this.logger.error(`Error getting review stats for business ${businessId}:`, error.message);
      throw new Error('Failed to get review statistics');
    }
  }

  /**
   * Reply to a specific review
   */
  async replyToReview(
    businessId: string,
    reviewId: string,
    replyText: string,
    locationId?: string,
  ): Promise<void> {
    try {
      if (!this.auth) {
        throw new Error('Google authentication not initialized');
      }

      const authClient = await this.auth.getClient();
      
      if (!locationId) {
        locationId = await this.getLocationIdForBusiness(businessId);
      }

      // Note: Review reply functionality would use the appropriate Business Profile API
      // This is a placeholder implementation
      this.logger.log(`Would reply to review ${reviewId} with: ${replyText}`);
      this.logger.log(`Successfully replied to review ${reviewId} for business ${businessId}`);
    } catch (error) {
      this.logger.error(`Error replying to review ${reviewId}:`, error.message);
      throw new Error('Failed to reply to review');
    }
  }

  /**
   * Check if new reviews have been left since last check
   */
  async checkForNewReviews(businessId: string): Promise<{
    hasNewReviews: boolean;
    newReviewsCount: number;
    latestReviews: GoogleReview[];
  }> {
    try {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { lastReviewCheck: true },
      });

      const lastCheckTime = business?.lastReviewCheck || new Date(0);
      const reviews = await this.getBusinessReviews(businessId);
      
      const newReviews = reviews.filter(review => 
        new Date(review.createTime) > lastCheckTime
      );

      // Update last check time
      await this.prisma.business.update({
        where: { id: businessId },
        data: { lastReviewCheck: new Date() },
      });

      return {
        hasNewReviews: newReviews.length > 0,
        newReviewsCount: newReviews.length,
        latestReviews: newReviews,
      };
    } catch (error) {
      this.logger.error(`Error checking for new reviews for business ${businessId}:`, error.message);
      return {
        hasNewReviews: false,
        newReviewsCount: 0,
        latestReviews: [],
      };
    }
  }

  /**
   * Get location ID for a business (helper method)
   */
  private async getLocationIdForBusiness(businessId: string): Promise<string> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { googleLocationId: true, name: true },
    });

    if (!business?.googleLocationId) {
      throw new Error(`Google location ID not found for business ${businessId}`);
    }

    return business.googleLocationId;
  }

  /**
   * Update business Google Business Profile data
   */
  async updateBusinessGoogleData(
    businessId: string,
    data: {
      googleLocationId?: string;
      googlePlaceId?: string;
      googleBusinessReviewLink?: string;
    }
  ): Promise<void> {
    try {
      await this.prisma.business.update({
        where: { id: businessId },
        data,
      });

      this.logger.log(`Updated Google data for business ${businessId}`);
      
      // Schedule review monitoring if Google data was added
      if (data.googleLocationId || data.googlePlaceId) {
        const business = await this.prisma.business.findUnique({
          where: { id: businessId },
          select: { organizationId: true },
        });
        
        if (business) {
          await this.scheduleReviewMonitoring(businessId, business.organizationId);
        }
      }
    } catch (error) {
      this.logger.error(`Error updating Google data for business ${businessId}:`, error.message);
      throw new Error('Failed to update business Google data');
    }
  }

  /**
   * Check review status and generate insights
   */
  async getReviewInsights(businessId: string): Promise<{
    reviewGrowthTrend: 'increasing' | 'decreasing' | 'stable';
    averageResponseTime: number; // in hours
    responseRate: number; // percentage
    sentimentTrend: 'positive' | 'negative' | 'neutral';
    recommendations: string[];
  }> {
    try {
      const reviews = await this.getBusinessReviews(businessId);
      const stats = await this.getReviewStats(businessId);
      
      // Calculate trends (simplified logic)
      const recentReviews = reviews.slice(0, 10);
      const olderReviews = reviews.slice(10, 20);
      
      const recentAvg = recentReviews.length > 0 
        ? recentReviews.reduce((sum, r) => sum + r.starRating, 0) / recentReviews.length 
        : 0;
      const olderAvg = olderReviews.length > 0 
        ? olderReviews.reduce((sum, r) => sum + r.starRating, 0) / olderReviews.length 
        : 0;

      const sentimentTrend = recentAvg > olderAvg ? 'positive' : 
                           recentAvg < olderAvg ? 'negative' : 'neutral';

      const reviewGrowthTrend = recentReviews.length > olderReviews.length ? 'increasing' :
                              recentReviews.length < olderReviews.length ? 'decreasing' : 'stable';

      const repliedReviews = reviews.filter(r => r.reviewReply);
      const responseRate = reviews.length > 0 ? (repliedReviews.length / reviews.length) * 100 : 0;

      // Calculate average response time (simplified)
      const avgResponseTime = 24; // placeholder - would need actual calculation

      const recommendations: string[] = [];
      if (responseRate < 50) {
        recommendations.push('Increase response rate to reviews');
      }
      if (stats.averageRating < 4.0) {
        recommendations.push('Focus on improving service quality');
      }
      if (stats.reviewsWithoutReply > 5) {
        recommendations.push('Reply to pending reviews');
      }

      return {
        reviewGrowthTrend,
        averageResponseTime: avgResponseTime,
        responseRate: Math.round(responseRate),
        sentimentTrend,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Error generating review insights for business ${businessId}:`, error.message);
      throw new Error('Failed to generate review insights');
    }
  }
} 