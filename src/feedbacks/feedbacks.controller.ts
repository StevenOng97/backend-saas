import { Controller, Get, Post, Body, Param, Query, HttpStatus, NotFoundException, Logger, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { request, Request } from 'express';
import { FeedbacksService } from './feedbacks.service';
import { PrismaService } from '../prisma/prisma.service';
import { RatingValue } from '@prisma/client';

@Controller('feedbacks')
export class FeedbacksController {
  private readonly logger = new Logger(FeedbacksController.name);

  constructor(
    private readonly feedbacksService: FeedbacksService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get invite details for rating page (public endpoint)
   */
  @Get('rate/:inviteId')
  async getInviteForRating(@Param('inviteId') inviteId: string) {
    try {
      const ipAddress = request.ip || request.connection.remoteAddress || 'unknown';

      const invite = await this.feedbacksService.getInviteForRating(inviteId, ipAddress);
      return {
        status: HttpStatus.OK,
        data: invite,
      };
    } catch (error) {
      this.logger.error(`Error getting invite for rating: ${error.message}`);
      
      if (error.message.includes('not found') || error.message.includes('expired')) {
        throw new NotFoundException(error.message);
      }
      
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to load rating page',
      };
    }
  }

  /**
   * Submit rating - implements Negative Feedback Shield
   * Thumbs up (1) → Google Reviews, Thumbs down (0) → Feedback form
   */
  @Post('rate/:inviteId/rating')
  async submitRating(
    @Param('inviteId') inviteId: string,
    @Body() ratingData: { rating: RatingValue; deviceInfo?: string },
    @Req() request: Request,
  ) {
    try {
      const { rating, deviceInfo } = ratingData;
      
      // Validate rating value (1 = thumbs up, 0 = thumbs down)
      if (rating !== RatingValue.THUMBS_UP && rating !== RatingValue.THUMBS_DOWN) {
        throw new BadRequestException('Rating must be 0 (thumbs down) or 1 (thumbs up)');
      }

      // Get client IP
      const ipAddress = request.ip || request.connection.remoteAddress || 'unknown';

      // Submit rating using existing service
      const result = await this.feedbacksService.submitRating(
        inviteId,
        rating,
        deviceInfo,
        ipAddress,
      );

      this.logger.log(`Rating submitted for invite ${inviteId}: ${rating === RatingValue.THUMBS_UP ? 'thumbs up' : 'thumbs down'}`);

      return {
        status: HttpStatus.OK,
        message: 'Rating submitted successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error submitting rating: ${error.message}`);
      
      if (error.message.includes('not found') || error.message.includes('expired')) {
        throw new NotFoundException(error.message);
      }
      
      if (error.message.includes('already rated')) {
        throw new BadRequestException(error.message);
      }
      
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to submit rating',
      };
    }
  }

  /**
   * Submit feedback for negative ratings
   */
  @Post('rating/:ratingId/feedback')
  async submitFeedbackForRating(
    @Param('ratingId') ratingId: string,
    @Body() feedbackData: { content: string },
  ) {
    try {
      const { content } = feedbackData;
      
      if (!content || content.trim().length === 0) {
        throw new BadRequestException('Feedback content is required');
      }

      const result = await this.feedbacksService.submitFeedbackForRating(
        ratingId,
        content.trim(),
      );

      this.logger.log(`Feedback submitted for rating ${ratingId}`);

      return {
        status: HttpStatus.CREATED,
        message: 'Thank you for your feedback. Your input helps us improve our service.',
        data: {
          feedbackId: result.id,
          submitted: true,
        },
      };
    } catch (error) {
      this.logger.error(`Error submitting feedback: ${error.message}`);
      
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      
      if (error.message.includes('already provided') || error.message.includes('only be submitted for negative')) {
        throw new BadRequestException(error.message);
      }
      
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to submit feedback',
      };
    }
  }

  @Post()
  async createFeedback(@Body() data: { inviteId: string; content: string }) {
    try {
      const feedback = await this.feedbacksService.createFeedback(data);
      return {
        status: HttpStatus.CREATED,
        data: feedback,
      };
    } catch (error) {
      this.logger.error(`Error creating feedback: ${error.message}`);
      
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create feedback',
      };
    }
  }

  @Get('business/:businessId')
  async getFeedbackForBusiness(
    @Param('businessId') businessId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    try {
      const feedback = await this.feedbacksService.getFeedbackForBusiness(
        businessId,
        {
          skip: skip ? parseInt(skip) : undefined,
          take: take ? parseInt(take) : undefined,
        },
      );
      
      return {
        status: HttpStatus.OK,
        data: feedback,
      };
    } catch (error) {
      this.logger.error(`Error getting business feedback: ${error.message}`);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to get feedback',
      };
    }
  }

  @Get('stats/business/:businessId')
  async getFeedbackStats(@Param('businessId') businessId: string) {
    try {
      const stats = await this.feedbacksService.getFeedbackStats(businessId);
      
      return {
        status: HttpStatus.OK,
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Error getting feedback stats: ${error.message}`);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to get feedback statistics',
      };
    }
  }

  /**
   * Get feedback thread for dashboard communication
   */
  @Get('thread/:inviteId')
  async getFeedbackThread(@Param('inviteId') inviteId: string) {
    try {
      const thread = await this.feedbacksService.getFeedbackThread(inviteId);
      return {
        status: HttpStatus.OK,
        data: thread,
      };
    } catch (error) {
      this.logger.error(`Error getting feedback thread: ${error.message}`);
      
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to load feedback thread',
      };
    }
  }
} 