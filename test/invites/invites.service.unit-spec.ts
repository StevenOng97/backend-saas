import { Test, TestingModule } from '@nestjs/testing';
import { InvitesService } from '../../src/invites/invites.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { InviteStatus } from '@prisma/client';
import { mockPrismaService } from '../mocks/prisma.mock';
import { mockQueue } from '../mocks/queue.mock';
import { CreateInviteDto } from '../../src/invites/dto/create-invite.dto';
import { NotFoundException } from '@nestjs/common';

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-token')
  })
}));

describe('InvitesService', () => {
  let service: InvitesService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: 'BullQueue_sms', useValue: mockQueue },
      ],
    }).compile();

    service = module.get<InvitesService>(InvitesService);
    
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const businessId = 'business-id';
    const createInviteDto: CreateInviteDto = {
      customerId: 'customer-id',
      message: 'Test invitation message'
    };
    
    const mockCustomer = {
      id: 'customer-id',
      businessId: 'business-id',
      name: 'Test Customer',
      phone: '+1234567890',
    };
    
    const mockInvite = {
      id: 'invite-id',
      businessId,
      customerId: createInviteDto.customerId,
      token: 'mock-token',
      status: InviteStatus.PENDING,
      expiresAt: expect.any(Date),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    };

    it('should create an invite and queue an SMS when customer exists', async () => {
      // Arrange
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.invite.create.mockResolvedValue(mockInvite);
      
      // Act
      const result = await service.create(businessId, createInviteDto);
      
      // Assert
      expect(mockPrismaService.customer.findFirst).toHaveBeenCalledWith({
        where: {
          id: createInviteDto.customerId,
          businessId,
        },
      });
      
      expect(mockPrismaService.invite.create).toHaveBeenCalledWith({
        data: {
          businessId,
          customerId: createInviteDto.customerId,
          token: 'mock-token',
          expiresAt: expect.any(Date),
          status: InviteStatus.PENDING,
        },
      });
      
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send',
        {
          businessId,
          customerId: createInviteDto.customerId,
          inviteId: mockInvite.id,
          message: createInviteDto.message,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
      
      expect(result).toEqual({
        inviteId: mockInvite.id,
        jobId: 'mock-job-id',
      });
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      // Arrange
      mockPrismaService.customer.findFirst.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.create(businessId, createInviteDto)).rejects.toThrow(
        new NotFoundException('Customer not found or does not belong to this business')
      );
      
      expect(mockPrismaService.invite.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when customer belongs to different business', async () => {
      // Arrange
      const differentBusinessCustomer = {
        ...mockCustomer,
        businessId: 'different-business-id',
      };
      mockPrismaService.customer.findFirst.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.create(businessId, createInviteDto)).rejects.toThrow(
        new NotFoundException('Customer not found or does not belong to this business')
      );
      
      expect(mockPrismaService.invite.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
}); 