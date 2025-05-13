import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InviteLimitMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const business = req['business'];
    
    if (!business || !business.subscription) {
      throw new HttpException('Business subscription not found', HttpStatus.BAD_REQUEST);
    }

    // Get the invite limit from the subscription
    const { inviteLimit } = business.subscription;

    // Get the current month's invites count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const inviteCount = await this.prisma.invite.count({
      where: {
        businessId: business.id,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Check if the invite limit is reached
    if (inviteCount >= inviteLimit) {
      throw new HttpException(
        'Monthly invite limit reached for your subscription plan',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // If we get here, the limit is not reached
    next();
  }
} 