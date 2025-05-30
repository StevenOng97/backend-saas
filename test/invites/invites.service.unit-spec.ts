import { Test, TestingModule } from '@nestjs/testing';
import { InvitesService } from '../../src/invites/invites.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { InviteStatus } from '@prisma/client';
import { mockPrismaService } from '../mocks/prisma.mock';
import { mockQueue } from '../mocks/queue.mock';
import { CreateInviteDto, CreateBatchInviteDto } from '../../src/invites/dto/create-invite.dto';
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
    const organizationId = 'organization-id';
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
      const result = await service.create(businessId, organizationId, createInviteDto);
      
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
          organizationId,
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
      await expect(service.create(businessId, organizationId, createInviteDto)).rejects.toThrow(
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
      await expect(service.create(businessId, organizationId, createInviteDto)).rejects.toThrow(
        new NotFoundException('Customer not found or does not belong to this business')
      );
      
      expect(mockPrismaService.invite.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('createBatch', () => {
    const businessId = 'business-id';
    const organizationId = 'organization-id';
    const createBatchInviteDto: CreateBatchInviteDto = {
      customerIds: ['customer-1', 'customer-2', 'customer-3'],
      message: 'Batch invitation message'
    };
    
    const mockCustomers = [
      { id: 'customer-1', businessId: 'business-id', name: 'Customer 1', phone: '+1234567890' },
      { id: 'customer-2', businessId: 'business-id', name: 'Customer 2', phone: '+1234567891' },
      { id: 'customer-3', businessId: 'business-id', name: 'Customer 3', phone: '+1234567892' },
    ];

    const mockCreatedInvites = [
      { id: 'invite-1', businessId, organizationId, customerId: 'customer-1', status: InviteStatus.PENDING, createdAt: new Date() },
      { id: 'invite-2', businessId, organizationId, customerId: 'customer-2', status: InviteStatus.PENDING, createdAt: new Date() },
      { id: 'invite-3', businessId, organizationId, customerId: 'customer-3', status: InviteStatus.PENDING, createdAt: new Date() },
    ];

    it('should create batch invites and queue SMS jobs when all customers exist', async () => {
      // Arrange
      mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrismaService.invite.createManyAndReturn.mockResolvedValue(mockCreatedInvites);
      mockQueue.addBulk.mockResolvedValue([
        { id: 'job-1' },
        { id: 'job-2' },
        { id: 'job-3' },
      ]);
      
      // Act
      const result = await service.createBatch(businessId, organizationId, createBatchInviteDto);
      
      // Assert
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: createBatchInviteDto.customerIds },
          businessId,
        },
      });
      
      expect(mockPrismaService.invite.createManyAndReturn).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            businessId,
            organizationId,
            customerId: 'customer-1',
            token: 'mock-token',
            status: InviteStatus.PENDING,
          }),
          expect.objectContaining({
            businessId,
            organizationId,
            customerId: 'customer-2',
            token: 'mock-token',
            status: InviteStatus.PENDING,
          }),
          expect.objectContaining({
            businessId,
            organizationId,
            customerId: 'customer-3',
            token: 'mock-token',
            status: InviteStatus.PENDING,
          }),
        ]),
      });
      
      expect(mockQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'send',
            data: {
              businessId,
              customerId: 'customer-1',
              inviteId: 'invite-1',
              message: createBatchInviteDto.message,
            },
          }),
          expect.objectContaining({
            name: 'send',
            data: {
              businessId,
              customerId: 'customer-2',
              inviteId: 'invite-2',
              message: createBatchInviteDto.message,
            },
          }),
          expect.objectContaining({
            name: 'send',
            data: {
              businessId,
              customerId: 'customer-3',
              inviteId: 'invite-3',
              message: createBatchInviteDto.message,
            },
          }),
        ])
      );
      
      expect(result).toEqual({
        invitesCreated: 3,
        jobIds: ['job-1', 'job-2', 'job-3'],
        inviteIds: ['invite-1', 'invite-2', 'invite-3'],
      });
    });

    it('should throw NotFoundException when some customers do not exist', async () => {
      // Arrange
      const partialCustomers = mockCustomers.slice(0, 2); // Only return 2 out of 3 customers
      mockPrismaService.customer.findMany.mockResolvedValue(partialCustomers);
      
      // Act & Assert
      await expect(service.createBatch(businessId, organizationId, createBatchInviteDto)).rejects.toThrow(
        new NotFoundException('Customers not found or do not belong to this business: customer-3')
      );
      
      expect(mockPrismaService.invite.createManyAndReturn).not.toHaveBeenCalled();
      expect(mockQueue.addBulk).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when no customers exist', async () => {
      // Arrange
      mockPrismaService.customer.findMany.mockResolvedValue([]);
      
      // Act & Assert
      await expect(service.createBatch(businessId, organizationId, createBatchInviteDto)).rejects.toThrow(
        new NotFoundException('Customers not found or do not belong to this business: customer-1, customer-2, customer-3')
      );
      
      expect(mockPrismaService.invite.createManyAndReturn).not.toHaveBeenCalled();
      expect(mockQueue.addBulk).not.toHaveBeenCalled();
    });
  });
}); 