import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignType, UserRole } from '@prisma/client';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 'user-id',
    organizationId: 'org-id',
    role: UserRole.ADMIN,
  } as any;

  const mockBusiness = {
    id: 'business-id',
    organizationId: 'org-id',
    name: 'Test Business',
    email: 'test@business.com',
    phone: null,
    googleBusinessReviewLink: null,
    googleLocationId: null,
    googlePlaceId: null,
    lastReviewCheck: null,
    isMainLocation: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    senderType: 'shared',
    senderPhone: null,
    a2pBrandId: null,
    a2pCampaignId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        {
          provide: PrismaService,
          useValue: {
            campaign: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            business: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createCampaignDto = {
      name: 'Test Campaign',
      type: CampaignType.SMS,
      content: 'Hi {customer_name}!',
      businessId: 'business-id',
    };

    it('should create a campaign successfully', async () => {
      const mockCampaign = { id: 'campaign-id', ...createCampaignDto };
      
      jest.spyOn(prismaService.business, 'findFirst').mockResolvedValue(mockBusiness);
      jest.spyOn(prismaService.campaign, 'create').mockResolvedValue(mockCampaign as any);

      const result = await service.create(createCampaignDto, mockUser);

      expect(result).toEqual(mockCampaign);
      expect(prismaService.business.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'business-id',
          organizationId: 'org-id',
        },
      });
    });

    it('should throw error if business not found', async () => {
      jest.spyOn(prismaService.business, 'findFirst').mockResolvedValue(null);

      await expect(service.create(createCampaignDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if EMAIL campaign without subject', async () => {
      const emailCampaign = {
        ...createCampaignDto,
        type: CampaignType.EMAIL,
        subject: undefined,
      };

      jest.spyOn(prismaService.business, 'findFirst').mockResolvedValue(mockBusiness);

      await expect(service.create(emailCampaign, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if businessId is missing', async () => {
      const campaignWithoutBusiness = {
        ...createCampaignDto,
        businessId: undefined,
      };

      await expect(service.create(campaignWithoutBusiness, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByType', () => {
    it('should find campaigns by type', async () => {
      const mockCampaigns = [
        { id: 'sms-1', type: CampaignType.SMS },
        { id: 'sms-2', type: CampaignType.SMS },
      ];

      jest.spyOn(prismaService.campaign, 'findMany').mockResolvedValue(mockCampaigns as any);

      const result = await service.findByType(CampaignType.SMS, mockUser);

      expect(result).toEqual(mockCampaigns);
      expect(prismaService.campaign.findMany).toHaveBeenCalledWith({
        where: {
          type: CampaignType.SMS,
          Business: {
            organizationId: 'org-id',
          },
        },
        include: {
          Business: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('backward compatibility methods', () => {
    it('should find SMS templates', async () => {
      const spy = jest.spyOn(service, 'findByType').mockResolvedValue([]);
      
      await service.findSmsTemplates(mockUser);
      
      expect(spy).toHaveBeenCalledWith(CampaignType.SMS, mockUser);
    });

    it('should find email templates', async () => {
      const spy = jest.spyOn(service, 'findByType').mockResolvedValue([]);
      
      await service.findEmailTemplates(mockUser);
      
      expect(spy).toHaveBeenCalledWith(CampaignType.EMAIL, mockUser);
    });
  });
}); 