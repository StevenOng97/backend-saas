import { Controller, Get, Post, Body, Param, Query, HttpStatus, NotFoundException, Logger, UseGuards } from '@nestjs/common';
import { FeedbacksService } from './feedbacks.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('feedbacks')
export class FeedbacksController {
  private readonly logger = new Logger(FeedbacksController.name);

  constructor(
    private readonly feedbacksService: FeedbacksService,
    private readonly prisma: PrismaService,
  ) {}

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
} 