import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class FeedbacksService {
  private readonly logger = new Logger(FeedbacksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Get invite details for rating page (public access)
   */
  async getInviteForRating(inviteId: string): Promise<any> {
    const invite = await this.prisma.invite.findUnique({
      where: { id: inviteId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            googleBusinessReviewLink: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
        rating: {
          include: {
            feedback: true,
          },
        },
      },
    });

    if (!invite) {
      throw new Error(`Invite with ID ${inviteId} not found`);
    }

    // Check if invite is expired
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      throw new Error(`Invite with ID ${inviteId} has expired`);
    }

    return {
      id: invite.id,
      businessName: invite.business.name,
      customerName: invite.customer?.name || 'Customer',
      hasRated: !!invite.rating,
      ratingValue: invite.rating?.value || null,
      hasFeedback: !!invite.rating?.feedback,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Submit rating and implement Negative Feedback Shield logic
   */
  async submitRating(
    inviteId: string,
    rating: number,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // Get invite with business details
      const invite = await tx.invite.findUnique({
        where: { id: inviteId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              googleBusinessReviewLink: true,
            },
          },
          customer: {
            select: {
              name: true,
            },
          },
          rating: true,
        },
      });

      if (!invite) {
        throw new Error(`Invite with ID ${inviteId} not found`);
      }

      // Check if invite is expired
      if (invite.expiresAt && new Date() > invite.expiresAt) {
        throw new Error(`Invite with ID ${inviteId} has expired`);
      }

      // Check if already rated
      if (invite.rating) {
        throw new Error(`This invite has already been rated`);
      }

      // Update invite with tracking info
      await tx.invite.update({
        where: { id: inviteId },
        data: {
          openedAt: new Date(),
          deviceInfo: deviceInfo || null,
          ipAddress: ipAddress || null,
        },
      });

      // Create rating record
      const ratingRecord = await tx.rating.create({
        data: {
          inviteId: inviteId,
          value: rating,
        },
      });

      // Determine redirect logic based on rating
      let redirectType: string;
      let redirectUrl: string;
      let requiresFeedback = false;

      if (rating === 1) {
        // Thumbs up → Send to Google Reviews
        redirectType = 'google_reviews';
        redirectUrl = invite.business.googleBusinessReviewLink || 'https://google.com/search?q=review+' + encodeURIComponent(invite.business.name);
        this.logger.log(`Positive rating for ${invite.business.name} - redirecting to Google Reviews`);
      } else {
        // Thumbs down → Send to private feedback form
        redirectType = 'feedback_form';
        redirectUrl = `/feedback-form/${inviteId}`;
        requiresFeedback = true;
        this.logger.log(`Negative rating for ${invite.business.name} - redirecting to feedback form`);
      }

      return {
        rating: ratingRecord.value,
        ratingId: ratingRecord.id,
        redirectType,
        redirectUrl,
        requiresFeedback,
        businessName: invite.business.name,
        customerName: invite.customer?.name || 'Customer',
      };
    });
  }

  /**
   * Submit feedback for negative ratings
   */
  async submitFeedbackForRating(ratingId: string, content: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // Get rating with related data
      const rating = await tx.rating.findUnique({
        where: { id: ratingId },
        include: {
          invite: {
            include: {
              business: true,
              customer: true,
              organization: {
                include: {
                  users: {
                    where: { role: 'ADMIN' },
                  },
                },
              },
            },
          },
          feedback: true,
        },
      });

      if (!rating) {
        throw new Error(`Rating with ID ${ratingId} not found`);
      }

      if (rating.feedback) {
        throw new Error(`Feedback has already been provided for this rating`);
      }

      // Only allow feedback for negative ratings
      if (rating.value !== 0) {
        throw new Error(`Feedback can only be submitted for negative ratings`);
      }

      // Create feedback record
      const feedback = await tx.feedback.create({
        data: {
          ratingId: ratingId,
          content: content,
        },
      });

      // Send notification emails to organization admins
      const organization = rating.invite.organization;
      if (organization && organization.users.length > 0) {
        for (const admin of organization.users) {
          try {
            await this.notifyAdminOfNegativeFeedback(admin.email, feedback, rating);
          } catch (error) {
            this.logger.error(`Failed to send notification email to ${admin.email}: ${error.message}`);
            // Continue sending to other admins even if one fails
          }
        }
      }

      return feedback;
    });
  }

  /**
   * Create a new feedback entry (legacy method for backward compatibility)
   */
  async createFeedback(data: { inviteId: string; content: string }): Promise<any> {
    // Get the rating for this invite first
    const invite = await this.prisma.invite.findUnique({
      where: { id: data.inviteId },
      include: { rating: true },
    });

    if (!invite) {
      throw new Error(`Invite with ID ${data.inviteId} not found`);
    }

    if (!invite.rating) {
      throw new Error(`No rating found for invite ${data.inviteId}. Please submit a rating first.`);
    }

    // Use the new method
    return this.submitFeedbackForRating(invite.rating.id, data.content);
  }

  /**
   * Get all feedback for a business
   */
  async getFeedbackForBusiness(
    businessId: string,
    options: { skip?: number; take?: number } = {},
  ): Promise<any[]> {
    const { skip = 0, take = 20 } = options;

    return this.prisma.feedback.findMany({
      where: {
        rating: {
          invite: {
            businessId,
          },
        },
      },
      include: {
        rating: {
          include: {
            invite: {
              include: {
                customer: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });
  }

  /**
   * Get feedback statistics for a business
   */
  async getFeedbackStats(businessId: string): Promise<any> {
    // Get all ratings for this business
    const ratings = await this.prisma.rating.findMany({
      where: {
        invite: {
          businessId,
        },
      },
      include: {
        feedback: {
          select: {
            id: true,
          },
        },
      },
    });

    // Calculate statistics
    const totalRatings = ratings.length;
    let totalScore = 0;
    const ratingCounts = { 0: 0, 1: 0 }; // 0 = thumbs down, 1 = thumbs up
    let feedbackCount = 0;

    ratings.forEach((rating) => {
      totalScore += rating.value;
      ratingCounts[rating.value as 0 | 1]++;
      if (rating.feedback) {
        feedbackCount++;
      }
    });

    const averageRating = totalRatings > 0 ? totalScore / totalRatings : 0;
    const positivePercentage = totalRatings > 0 ? (ratingCounts[1] / totalRatings) * 100 : 0;

    return {
      totalRatings,
      averageRating,
      positivePercentage,
      ratingCounts: {
        thumbsUp: ratingCounts[1],
        thumbsDown: ratingCounts[0],
      },
      feedbackCount,
      negativeFeedbackShieldActive: ratingCounts[0] > 0, // Has negative ratings
    };
  }

  /**
   * Get feedback thread for dashboard communication
   */
  async getFeedbackThread(inviteId: string): Promise<any> {
    const invite = await this.prisma.invite.findUnique({
      where: { id: inviteId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        rating: {
          include: {
            feedback: true,
          },
        },
      },
    });

    if (!invite) {
      throw new Error(`Invite with ID ${inviteId} not found`);
    }

    return {
      invite: {
        id: invite.id,
        createdAt: invite.createdAt,
        openedAt: invite.openedAt,
      },
      business: invite.business,
      customer: invite.customer,
      rating: invite.rating ? {
        id: invite.rating.id,
        value: invite.rating.value,
        createdAt: invite.rating.createdAt,
      } : null,
      feedback: invite.rating?.feedback ? {
        id: invite.rating.feedback.id,
        content: invite.rating.feedback.content,
        createdAt: invite.rating.feedback.createdAt,
        updatedAt: invite.rating.feedback.updatedAt,
      } : null,
      hasNegativeRating: invite.rating?.value === 0,
      hasFeedback: !!invite.rating?.feedback,
    };
  }

  /**
   * Send notification email to admin for negative feedback
   */
  private async notifyAdminOfNegativeFeedback(
    email: string,
    feedback: any,
    rating: any,
  ): Promise<void> {
    const { invite } = rating;
    const { business, customer } = invite;
    const customerName = customer?.name || 'A customer';
    
    // Create HTML content for the notification email
    const htmlContent = `
      <div>
        <h1>🚨 Negative Feedback Alert - Feedback Shield Activated</h1>
        <p><strong>Business:</strong> ${business.name}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Rating:</strong> Thumbs Down (Negative)</p>
        <p><strong>Feedback:</strong> ${feedback.content}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <hr>
        <p><strong>🛡️ Negative Feedback Shield Status:</strong></p>
        <p style="color: #28a745;"><strong>✅ PROTECTED:</strong> This negative feedback was intercepted and kept private from public review sites.</p>
        <p style="color: #ffc107;"><strong>⚠️ ACTION REQUIRED:</strong> Please respond promptly to address the customer's concerns.</p>
        <p><strong>Dashboard Link:</strong> <a href="${process.env.FRONTEND_URL}/dashboard/feedback/${invite.id}">View & Respond</a></p>
      </div>
    `;

    const textContent = `
🚨 NEGATIVE FEEDBACK ALERT - Feedback Shield Activated

Business: ${business.name}
Customer: ${customerName}
Rating: Thumbs Down (Negative)
Feedback: ${feedback.content}
Date: ${new Date().toLocaleDateString()}

🛡️ NEGATIVE FEEDBACK SHIELD STATUS:
✅ PROTECTED: This negative feedback was intercepted and kept private from public review sites.
⚠️ ACTION REQUIRED: Please respond promptly to address the customer's concerns.

Dashboard Link: ${process.env.FRONTEND_URL}/dashboard/feedback/${invite.id}
    `;

    // Use the Resend email service
    try {
      await this.mailService.sendInviteEmail(
        email,
        '', // We're reusing the invite email method but not using the invite code
        textContent
      );
      this.logger.log(`Sent negative feedback notification email to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send negative feedback notification: ${error.message}`);
    }
  }

  /**
   * Send notification email to admin (legacy method)
   */
  private async notifyAdmin(
    email: string,
    feedback: any,
    invite: any,
  ): Promise<void> {
    // For backward compatibility, this method redirects to the new method
    // This assumes the feedback has a rating relation
    return this.notifyAdminOfNegativeFeedback(email, feedback, { invite });
  }
} 