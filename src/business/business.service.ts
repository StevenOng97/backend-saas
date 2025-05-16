import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(createBusinessDto: CreateBusinessDto, currentUser: User) {
    // Only ADMIN users can create new businesses
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can create new businesses',
      );
    }

    const business = await this.prisma.business.create({
      data: {
        ...createBusinessDto,
        organizationId: currentUser.organizationId,
      },
    });

    return business;
  }

  async findAll(currentUser: User) {
    if (!currentUser.organizationId) {
      return [];
    }

    return this.prisma.business.findMany({
      where: { organizationId: currentUser.organizationId },
    });
  }

  async findOne(id: string, currentUser: User) {
    const business = await this.prisma.business.findUnique({
      where: { id, organizationId: currentUser.organizationId },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID ${id} not found`);
    }

    return business;
  }

  async update(
    id: string,
    updateBusinessDto: UpdateBusinessDto,
    currentUser: User,
  ) {
    // Validate user has access to this business
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own business');
    }

    try {
      return await this.prisma.business.update({
        where: { id },
        data: updateBusinessDto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Business with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string, currentUser: User) {
    // Validate user has access to this business
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete businesses');
    }

    try {
      return await this.prisma.business.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Business with ID ${id} not found`);
      }
      throw error;
    }
  }
}
