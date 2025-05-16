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

    // Admin users can access all businesses
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // If no business ID is provided in the route (e.g., for findAll or create),
    // check if the user has a businessId (indicating they are a business owner)
    if (!businessId) {
      return user.businessId !== null;
    }

    // For business-specific operations, check if the business ID matches the user's business
    if (user.businessId !== businessId) {
      throw new ForbiddenException('You can only interact with your own business');
    }

    return true;
  }
} 