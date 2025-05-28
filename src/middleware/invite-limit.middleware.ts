import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InviteLimitMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Get user from authenticated user that Passport added to the request
    const user = req.user as any;
    
    console.log("User:", req.user)
    if (!user || !user.organizationId) {
      throw new HttpException('User not associated with an organization', HttpStatus.BAD_REQUEST);
    }
    
    // Get the business ID from request parameters or body
    const businessId = req.params.businessId || req.body.businessId;
    
    if (!businessId) {
      throw new HttpException('Business ID is required', HttpStatus.BAD_REQUEST);
    }
    
    // Verify that the business belongs to the user's organization
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { organizationId: true }
    });
    
    if (!business) {
      throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
    }
    
    if (business.organizationId !== user.organizationId) {
      throw new HttpException('Unauthorized to access this business', HttpStatus.FORBIDDEN);
    }
    
    // Fetch the organization's subscription
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: user.organizationId }
    });
    
    if (!subscription) {
      throw new HttpException('Organization subscription not found', HttpStatus.BAD_REQUEST);
    }

    // Get the current month's invites count for the entire organization
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const inviteCount = await this.prisma.invite.count({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: startOfMonth }
      }
    });
    
    // Check if the invite limit is reached
    if (inviteCount >= subscription.inviteLimit) {
      throw new HttpException(
        'Monthly invite limit reached for your subscription plan',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // If we get here, the limit is not reached
    next();
  }
} 