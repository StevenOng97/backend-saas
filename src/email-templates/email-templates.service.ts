import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class EmailTemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(createEmailTemplateDto: CreateEmailTemplateDto, currentUser: User) {
    // Verify the business belongs to the user's organization
    if (createEmailTemplateDto.businessId) {
      const business = await this.prisma.business.findFirst({
        where: {
          id: createEmailTemplateDto.businessId,
          organizationId: currentUser.organizationId,
        },
      });

      if (!business) {
        throw new NotFoundException(`Business with ID ${createEmailTemplateDto.businessId} not found`);
      }
    }

    const emailTemplate = await this.prisma.emailTemplates.create({
      data: {
        name: createEmailTemplateDto.name,
        template: createEmailTemplateDto.template,
        businessId: createEmailTemplateDto.businessId,
      },
      include: {
        Business: true,
      },
    });

    return emailTemplate;
  }

  async update(
    id: string,
    updateEmailTemplateDto: UpdateEmailTemplateDto,
    currentUser: User,
  ) {
    // First, check if the template exists and belongs to user's organization
    const existingTemplate = await this.prisma.emailTemplates.findFirst({
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
      throw new NotFoundException(`Email Template with ID ${id} not found`);
    }

    // Only admins and business owners can update templates
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Insufficient permissions to update Email templates');
    }

    try {
      return await this.prisma.emailTemplates.update({
        where: { id },
        data: {
          ...(updateEmailTemplateDto.name && { name: updateEmailTemplateDto.name }),
          ...(updateEmailTemplateDto.template && { template: updateEmailTemplateDto.template }),
          updatedAt: new Date(),
        },
        include: {
          Business: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Email Template with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string, currentUser: User) {
    // First, check if the template exists and belongs to user's organization
    const existingTemplate = await this.prisma.emailTemplates.findFirst({
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
      throw new NotFoundException(`Email Template with ID ${id} not found`);
    }

    // Only admins and business owners can delete templates
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Insufficient permissions to delete Email templates');
    }

    try {
      await this.prisma.emailTemplates.delete({
        where: { id },
      });

      return {
        isSuccess: true,
        message: `Email Template with ID ${id} deleted successfully`,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Email Template with ID ${id} not found`);
      }
      throw error;
    }
  }
} 