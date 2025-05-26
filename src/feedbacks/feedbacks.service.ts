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
   * Create a new feedback entry
   */
  async createFeedback(data: { inviteId: string; content: string }): Promise<any> {
    // Start transaction to ensure all operations succeed or fail together
    return this.prisma.$transaction(async (tx) => {
      // Check if invite exists
      const invite = await tx.invite.findUnique({
        where: { id: data.inviteId },
        include: {
          business: true,
          customer: true,
        },
      });

      if (!invite) {
        throw new Error(`Invite with ID ${data.inviteId} not found`);
      }

      // Save feedback to database
      const feedback = await tx.feedback.create({
        data: {
          inviteId: data.inviteId,
          content: data.content,
        },
        include: {
          invite: {
            include: {
              business: true,
              customer: true,
            },
          },
        },
      });

      // Get organization admins to notify them
      const organization = await tx.organization.findUnique({
        where: { id: invite.organizationId },
        include: {
          users: {
            where: { role: 'ADMIN' },
          },
        },
      });

      // Send notification emails to organization admins
      if (organization && organization.users.length > 0) {
        for (const admin of organization.users) {
          try {
            await this.notifyAdmin(admin.email, feedback, invite);
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
   * Get all feedback for a business
   */
  async getFeedbackForBusiness(
    businessId: string,
    options: { skip?: number; take?: number } = {},
  ): Promise<any[]> {
    const { skip = 0, take = 20 } = options;

    return this.prisma.feedback.findMany({
      where: {
        invite: {
          businessId,
        },
      },
      include: {
        invite: {
          include: {
            customer: true,
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
    // Get all invites for this business that have a rating
    const invites = await this.prisma.invite.findMany({
      where: {
        businessId,
        ratingValue: {
          not: null,
        },
      },
      select: {
        ratingValue: true,
        feedback: {
          select: {
            id: true,
          },
        },
      },
    });

    // Calculate statistics
    const totalRatings = invites.length;
    let totalScore = 0;
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let feedbackCount = 0;

    invites.forEach((invite) => {
      if (invite.ratingValue) {
        totalScore += invite.ratingValue;
        ratingCounts[invite.ratingValue as 1 | 2 | 3 | 4 | 5]++;
      }
      if (invite.feedback) {
        feedbackCount++;
      }
    });

    const averageRating = totalRatings > 0 ? totalScore / totalRatings : 0;

    return {
      totalRatings,
      averageRating,
      ratingCounts,
      feedbackCount,
    };
  }

  /**
   * Send notification email to admin
   */
  private async notifyAdmin(
    email: string,
    feedback: any,
    invite: any,
  ): Promise<void> {
    const { business, customer } = invite;
    const customerName = customer?.name || 'A customer';
    
    // Create HTML content for the notification email
    const htmlContent = `
      <div>
        <h1>New Customer Feedback</h1>
        <p><strong>Business:</strong> ${business.name}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Rating:</strong> ${invite.ratingValue || 'No rating'}</p>
        <p><strong>Feedback:</strong> ${feedback.content}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
    `;

    const textContent = `
      New Customer Feedback\n
      Business: ${business.name}\n
      Customer: ${customerName}\n
      Rating: ${invite.ratingValue || 'No rating'}\n
      Feedback: ${feedback.content}\n
      Date: ${new Date().toLocaleDateString()}
    `;

    // Use the Resend email service
    try {
      await this.mailService.sendInviteEmail(
        email,
        '', // We're reusing the invite email method but not using the invite code
        textContent
      );
      this.logger.log(`Sent feedback notification email to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send feedback notification: ${error.message}`);
    }
  }
} 