import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto';
import { User, UserRole, CampaignType } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async findAll(currentUser: User) {
    return this.prisma.campaign.findMany({
      where: {
        Business: {
          organizationId: currentUser.organizationId,
        },
      },
      include: {
        Business: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, currentUser: User) {
    const campaign = await this.prisma.campaign.findFirst({
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

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async create(createCampaignDto: CreateCampaignDto, currentUser: User) {
    // BusinessId is required for campaign creation
    if (!createCampaignDto.businessId) {
      throw new BadRequestException('BusinessId is required for campaign creation');
    }

    // Verify the business belongs to the user's organization
    const business = await this.prisma.business.findFirst({
      where: {
        id: createCampaignDto.businessId,
        organizationId: currentUser.organizationId,
      },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID ${createCampaignDto.businessId} not found`);
    }

    // Validate that EMAIL campaigns have a subject
    if (createCampaignDto.type === CampaignType.EMAIL && !createCampaignDto.subject) {
      throw new BadRequestException('Email campaigns must have a subject');
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        name: createCampaignDto.name,
        description: createCampaignDto.description,
        type: createCampaignDto.type,
        status: createCampaignDto.status || 'DRAFT',
        subject: createCampaignDto.subject,
        content: createCampaignDto.content,
        sendDelay: createCampaignDto.sendDelay || 3,
        autoSend: createCampaignDto.autoSend || false,
        followUpSequence: createCampaignDto.followUpSequence || {},
        businessId: createCampaignDto.businessId,
      },
      include: {
        Business: true,
      },
    });

    return campaign;
  }

  async update(
    id: string,
    updateCampaignDto: UpdateCampaignDto,
    currentUser: User,
  ) {
    // First, check if the campaign exists and belongs to user's organization
    const existingCampaign = await this.prisma.campaign.findFirst({
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

    if (!existingCampaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    // Only admins and business owners can update campaigns
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Insufficient permissions to update campaigns');
    }

    // Validate that EMAIL campaigns have a subject
    const finalType = updateCampaignDto.type || existingCampaign.type;
    const finalSubject = updateCampaignDto.subject || existingCampaign.subject;
    
    if (finalType === CampaignType.EMAIL && !finalSubject) {
      throw new BadRequestException('Email campaigns must have a subject');
    }

    try {
      return await this.prisma.campaign.update({
        where: { id },
        data: {
          ...(updateCampaignDto.name && { name: updateCampaignDto.name }),
          ...(updateCampaignDto.description !== undefined && { description: updateCampaignDto.description }),
          ...(updateCampaignDto.type && { type: updateCampaignDto.type }),
          ...(updateCampaignDto.status && { status: updateCampaignDto.status }),
          ...(updateCampaignDto.subject !== undefined && { subject: updateCampaignDto.subject }),
          ...(updateCampaignDto.content && { content: updateCampaignDto.content }),
          ...(updateCampaignDto.sendDelay !== undefined && { sendDelay: updateCampaignDto.sendDelay }),
          ...(updateCampaignDto.autoSend !== undefined && { autoSend: updateCampaignDto.autoSend }),
          ...(updateCampaignDto.followUpSequence !== undefined && { followUpSequence: updateCampaignDto.followUpSequence }),
          updatedAt: new Date(),
        },
        include: {
          Business: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Campaign with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string, currentUser: User) {
    // First, check if the campaign exists and belongs to user's organization
    const existingCampaign = await this.prisma.campaign.findFirst({
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

    if (!existingCampaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    // Only admins and business owners can delete campaigns
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Insufficient permissions to delete campaigns');
    }

    try {
      await this.prisma.campaign.delete({
        where: { id },
      });

      return {
        isSuccess: true,
        message: `Campaign with ID ${id} deleted successfully`,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Campaign with ID ${id} not found`);
      }
      throw error;
    }
  }

  // Utility methods for backward compatibility and template-like functionality
  async findByType(type: CampaignType, currentUser: User) {
    return this.prisma.campaign.findMany({
      where: {
        type,
        Business: {
          organizationId: currentUser.organizationId,
        },
      },
      include: {
        Business: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findSmsTemplates(currentUser: User) {
    return this.findByType(CampaignType.SMS, currentUser);
  }

  async findEmailTemplates(currentUser: User) {
    return this.findByType(CampaignType.EMAIL, currentUser);
  }
} 