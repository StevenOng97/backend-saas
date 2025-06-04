import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSmsTemplateDto, UpdateSmsTemplateDto } from './dto';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class SmsTemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(createSmsTemplateDto: CreateSmsTemplateDto, currentUser: User) {
    // Verify the business belongs to the user's organization
    if (createSmsTemplateDto.businessId) {
      const business = await this.prisma.business.findFirst({
        where: {
          id: createSmsTemplateDto.businessId,
          organizationId: currentUser.organizationId,
        },
      });

      if (!business) {
        throw new NotFoundException(`Business with ID ${createSmsTemplateDto.businessId} not found`);
      }
    }

    const smsTemplate = await this.prisma.smsTemplates.create({
      data: {
        name: createSmsTemplateDto.name,
        template: createSmsTemplateDto.template,
        businessId: createSmsTemplateDto.businessId,
      },
      include: {
        Business: true,
      },
    });

    return smsTemplate;
  }

  async update(
    id: string,
    updateSmsTemplateDto: UpdateSmsTemplateDto,
    currentUser: User,
  ) {
    // First, check if the template exists and belongs to user's organization
    const existingTemplate = await this.prisma.smsTemplates.findFirst({
      where: {
        id,
        Business: {
          organizationId: currentUser.organizationId,
        },
      },
      include: {
        Business: true,
      },
    });

    if (!existingTemplate) {
      throw new NotFoundException(`SMS Template with ID ${id} not found`);
    }

    // Only admins and business owners can update templates
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Insufficient permissions to update SMS templates');
    }

    try {
      return await this.prisma.smsTemplates.update({
        where: { id },
        data: {
          ...(updateSmsTemplateDto.name && { name: updateSmsTemplateDto.name }),
          ...(updateSmsTemplateDto.template && { template: updateSmsTemplateDto.template }),
          updatedAt: new Date(),
        },
        include: {
          Business: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`SMS Template with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string, currentUser: User) {
    // First, check if the template exists and belongs to user's organization
    const existingTemplate = await this.prisma.smsTemplates.findFirst({
      where: {
        id,
        Business: {
          organizationId: currentUser.organizationId,
        },
      },
      include: {
        Business: true,
      },
    });

    if (!existingTemplate) {
      throw new NotFoundException(`SMS Template with ID ${id} not found`);
    }

    // Only admins and business owners can delete templates
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Insufficient permissions to delete SMS templates');
    }

    try {
      await this.prisma.smsTemplates.delete({
        where: { id },
      });

      return {
        isSuccess: true,
        message: `SMS Template with ID ${id} deleted successfully`,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`SMS Template with ID ${id} not found`);
      }
      throw error;
    }
  }
} 