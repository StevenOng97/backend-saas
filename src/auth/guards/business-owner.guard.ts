import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class BusinessOwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const businessId = request.params.id;

    const business = await this.prisma.business.findUnique({
      where: { id: businessId, organizationId: user.organizationId },
    });

    // For business-specific operations, check if the business ID matches the user's business
    if (!business) {
      throw new ForbiddenException('You can only interact with your own business');
    }

    return true;
  }
} 