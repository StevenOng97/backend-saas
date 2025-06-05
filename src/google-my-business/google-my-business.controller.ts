import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { GoogleMyBusinessService } from './google-my-business.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../decorators';
import { User } from '@prisma/client';
import { UpdateGoogleDataDto, ReplyToReviewDto } from './dto/google-my-business.dto';

@Controller('google-my-business')
@UseGuards(JwtAuthGuard)
export class GoogleMyBusinessController {
  constructor(
    private readonly googleMyBusinessService: GoogleMyBusinessService,
  ) {}

  /**
   * Generate or get Google My Business review link for the current business
   */
  @Get('review-link')
  async getReviewLink(@CurrentUser() user: User) {
    try {
      const businessId = (user as any).main_business_id;
      
      if (!businessId) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Business ID not found in user profile',
        };
      }

      const reviewLink = await this.googleMyBusinessService.generateReviewLink(businessId);
      
      return {
        status: HttpStatus.OK,
        data: {
          reviewLink,
          message: 'Review link generated successfully',
        },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to generate review link',
      };
    }
  }

  /**
   * Get Google reviews for the current business
   */
  @Get('reviews')
  async getReviews(@CurrentUser() user: User) {
    try {
      const businessId = (user as any).main_business_id;
      
      if (!businessId) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Business ID not found in user profile',
        };
      }

      const reviews = await this.googleMyBusinessService.getBusinessReviews(businessId);
      
      return {
        status: HttpStatus.OK,
        data: {
          reviews,
          count: reviews.length,
        },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch reviews',
      };
    }
  }

  /**
   * Get review statistics for the current business
   */
  @Get('stats')
  async getReviewStats(@CurrentUser() user: User) {
    try {
      const businessId = (user as any).main_business_id;
      
      if (!businessId) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Business ID not found in user profile',
        };
      }

      const stats = await this.googleMyBusinessService.getReviewStats(businessId);
      
      return {
        status: HttpStatus.OK,
        data: stats,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch review statistics',
      };
    }
  }

  /**
   * Check for new reviews since last check
   */
  @Get('check-new-reviews')
  async checkNewReviews(@CurrentUser() user: User) {
    try {
      const businessId = (user as any).main_business_id;
      
      if (!businessId) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Business ID not found in user profile',
        };
      }

      const result = await this.googleMyBusinessService.checkForNewReviews(businessId);
      
      return {
        status: HttpStatus.OK,
        data: result,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to check for new reviews',
      };
    }
  }

  /**
   * Get review insights and analytics
   */
  @Get('insights')
  async getReviewInsights(@CurrentUser() user: User) {
    try {
      const businessId = (user as any).main_business_id;
      
      if (!businessId) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Business ID not found in user profile',
        };
      }

      const insights = await this.googleMyBusinessService.getReviewInsights(businessId);
      
      return {
        status: HttpStatus.OK,
        data: insights,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch review insights',
      };
    }
  }

  /**
   * Reply to a specific Google review
   */
  @Post('reply')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async replyToReview(
    @Body() replyData: ReplyToReviewDto,
    @CurrentUser() user: User,
  ) {
    try {
      const businessId = (user as any).main_business_id;
      
      if (!businessId) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Business ID not found in user profile',
        };
      }

      await this.googleMyBusinessService.replyToReview(
        businessId,
        replyData.reviewId,
        replyData.replyText,
        replyData.locationId,
      );
      
      return {
        status: HttpStatus.OK,
        message: 'Successfully replied to review',
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to reply to review',
      };
    }
  }

  /**
   * Update Google Business Profile data for the current business
   */
  @Put('update-google-data')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateGoogleData(
    @Body() updateData: UpdateGoogleDataDto,
    @CurrentUser() user: User,
  ) {
    try {
      const businessId = (user as any).main_business_id;
      
      if (!businessId) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Business ID not found in user profile',
        };
      }

      await this.googleMyBusinessService.updateBusinessGoogleData(businessId, updateData);
      
      return {
        status: HttpStatus.OK,
        message: 'Successfully updated Google Business Profile data',
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to update Google data',
      };
    }
  }

  /**
   * Get Google reviews for a specific business (admin only)
   */
  @Get('business/:businessId/reviews')
  async getBusinessReviews(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: User,
  ) {
    try {
      // Only allow admin users to access other businesses' reviews
      if ((user as any).role !== 'ADMIN') {
        return {
          status: HttpStatus.FORBIDDEN,
          message: 'Access denied',
        };
      }

      const reviews = await this.googleMyBusinessService.getBusinessReviews(businessId);
      
      return {
        status: HttpStatus.OK,
        data: {
          reviews,
          count: reviews.length,
        },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch reviews',
      };
    }
  }

  /**
   * Get review statistics for a specific business (admin only)
   */
  @Get('business/:businessId/stats')
  async getBusinessReviewStats(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: User,
  ) {
    try {
      // Only allow admin users to access other businesses' stats
      if ((user as any).role !== 'ADMIN') {
        return {
          status: HttpStatus.FORBIDDEN,
          message: 'Access denied',
        };
      }

      const stats = await this.googleMyBusinessService.getReviewStats(businessId);
      
      return {
        status: HttpStatus.OK,
        data: stats,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch review statistics',
      };
    }
  }
} 