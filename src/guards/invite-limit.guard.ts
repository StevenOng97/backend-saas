import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InviteLimitGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as any;
    
    console.log("User:", request.user)
    if (!user || !user.organizationId) {
      throw new HttpException('User not associated with an organization', HttpStatus.BAD_REQUEST);
    }
    
    // Get the customer ID from request parameters or body
    const customerId = request.params.customerId || request.body.customerId;
    
    if (!customerId) {
      throw new HttpException('Customer ID is required', HttpStatus.BAD_REQUEST);
    }
    
    // Verify that the customer belongs to the user's organization
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { 
        business: {
          select: { organizationId: true }
        }
      }
    });
    
    if (!customer) {
      throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
    }
    
    if (customer.business.organizationId !== user.organizationId) {
      throw new HttpException('Unauthorized to access this customer', HttpStatus.FORBIDDEN);
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
    return true;
  }
} 