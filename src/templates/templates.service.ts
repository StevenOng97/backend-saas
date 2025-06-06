import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto';
import { User, UserRole, TemplateType } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(currentUser: User) {
    return this.prisma.template.findMany({
      where: {
        Business: {
          organizationId: currentUser.organizationId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, currentUser: User) {
    const template = await this.prisma.template.findFirst({
      where: {
        id,
        Business: {
          organizationId: currentUser.organizationId,
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async create(createTemplateDto: CreateTemplateDto, currentUser: User) {
    // BusinessId is required for template creation
    if (!createTemplateDto.businessId) {
      throw new BadRequestException(
        'BusinessId is required for template creation',
      );
    }

    // Verify the business belongs to the user's organization
    const business = await this.prisma.business.findFirst({
      where: {
        id: createTemplateDto.businessId,
        organizationId: currentUser.organizationId,
      },
    });

    if (!business) {
      throw new NotFoundException(
        `Business with ID ${createTemplateDto.businessId} not found`,
      );
    }

    // Validate that EMAIL templates have a subject
    if (
      createTemplateDto.type === TemplateType.EMAIL &&
      !createTemplateDto.subject
    ) {
      throw new BadRequestException('Email templates must have a subject');
    }

    const template = await this.prisma.template.create({
      data: {
        name: createTemplateDto.name,
        description: createTemplateDto.description,
        type: createTemplateDto.type,
        status: createTemplateDto.status || 'active',
        subject: createTemplateDto.subject,
        content: createTemplateDto.content,
        isDefault: createTemplateDto.isDefault || false,
        businessId: createTemplateDto.businessId,
      },
    });

    return template;
  }

  async update(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
    currentUser: User,
  ) {
    // First, check if the template exists and belongs to user's organization
    const existingTemplate = await this.prisma.template.findFirst({
      where: {
        id,
        Business: {
          organizationId: currentUser.organizationId,
        },
      },
    });

    if (!existingTemplate) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    // Only admins and business owners can update templates
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.BUSINESS_OWNER
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to update templates',
      );
    }

    // Validate that EMAIL templates have a subject
    const finalType = updateTemplateDto.type || existingTemplate.type;
    const finalSubject = updateTemplateDto.subject || existingTemplate.subject;

    if (finalType === TemplateType.EMAIL && !finalSubject) {
      throw new BadRequestException('Email templates must have a subject');
    }

    try {
      return await this.prisma.template.update({
        where: { id },
        data: {
          ...(updateTemplateDto.name && { name: updateTemplateDto.name }),
          ...(updateTemplateDto.description !== undefined && {
            description: updateTemplateDto.description,
          }),
          ...(updateTemplateDto.type && { type: updateTemplateDto.type }),
          ...(updateTemplateDto.status && { status: updateTemplateDto.status }),
          ...(updateTemplateDto.subject !== undefined && {
            subject: updateTemplateDto.subject,
          }),
          ...(updateTemplateDto.content && {
            content: updateTemplateDto.content,
          }),
          ...(updateTemplateDto.isDefault !== undefined && {
            isDefault: updateTemplateDto.isDefault,
          }),
          updatedAt: new Date(),
        },
        include: {
          Business: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Template with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string, currentUser: User) {
    // First, check if the template exists and belongs to user's organization
    const existingTemplate = await this.prisma.template.findFirst({
      where: {
        id,
        Business: {
          organizationId: currentUser.organizationId,
        },
      },
    });

    if (!existingTemplate) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    // Only admins and business owners can delete templates
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.BUSINESS_OWNER
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to delete templates',
      );
    }

    try {
      await this.prisma.template.delete({
        where: { id },
      });

      return {
        message: `Template with ID ${id} has been successfully deleted`,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Template with ID ${id} not found`);
      }
      throw error;
    }
  }

  async findByType(type: TemplateType, currentUser: User) {
    return this.prisma.template.findMany({
      where: {
        type,
        Business: {
          organizationId: currentUser.organizationId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findSmsTemplates(currentUser: User) {
    return this.findByType(TemplateType.SMS, currentUser);
  }

  async findEmailTemplates(currentUser: User) {
    return this.findByType(TemplateType.EMAIL, currentUser);
  }

  async findDefaultTemplates(currentUser: User) {
    return this.prisma.template.findMany({
      where: {
        isDefault: true,
        Business: {
          organizationId: currentUser.organizationId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
} 