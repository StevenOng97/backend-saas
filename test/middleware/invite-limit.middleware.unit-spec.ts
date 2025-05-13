import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { InviteLimitMiddleware } from '../../src/middleware/invite-limit.middleware';
import { PrismaService } from '../../src/prisma/prisma.service';
import { mockPrismaService } from '../mocks/prisma.mock';

describe('InviteLimitMiddleware', () => {
  let middleware: InviteLimitMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteLimitMiddleware,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    middleware = module.get<InviteLimitMiddleware>(InviteLimitMiddleware);
    
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    const mockRequest = () => {
      return {
        business: {
          id: 'business-id',
          subscription: {
            inviteLimit: 10,
          },
        },
      } as any;
    };

    const mockResponse = () => ({}) as any;
    
    const mockNextFunction = jest.fn();

    it('should allow request when under invite limit', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      mockPrismaService.invite.count.mockResolvedValue(5); // 5 invites this month, limit is 10
      
      // Act
      await middleware.use(req, res, mockNextFunction);
      
      // Assert
      expect(mockPrismaService.invite.count).toHaveBeenCalledWith({
        where: {
          businessId: 'business-id',
          createdAt: {
            gte: expect.any(Date),
          },
        },
      });
      expect(mockNextFunction).toHaveBeenCalled();
    });

    it('should throw exception when at invite limit', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      mockPrismaService.invite.count.mockResolvedValue(10); // 10 invites this month, limit is 10
      
      // Act & Assert
      await expect(middleware.use(req, res, mockNextFunction)).rejects.toThrow(
        new HttpException(
          'Monthly invite limit reached for your subscription plan',
          HttpStatus.TOO_MANY_REQUESTS,
        )
      );
      
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should throw exception when over invite limit', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      mockPrismaService.invite.count.mockResolvedValue(15); // 15 invites this month, limit is 10
      
      // Act & Assert
      await expect(middleware.use(req, res, mockNextFunction)).rejects.toThrow(
        new HttpException(
          'Monthly invite limit reached for your subscription plan',
          HttpStatus.TOO_MANY_REQUESTS,
        )
      );
      
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should throw exception when business subscription is not found', async () => {
      // Arrange
      const req = mockRequest();
      req.business.subscription = null;
      const res = mockResponse();
      
      // Act & Assert
      await expect(middleware.use(req, res, mockNextFunction)).rejects.toThrow(
        new HttpException(
          'Business subscription not found',
          HttpStatus.BAD_REQUEST,
        )
      );
      
      expect(mockPrismaService.invite.count).not.toHaveBeenCalled();
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should throw exception when business is not found', async () => {
      // Arrange
      const req = {} as any; // No business property
      const res = mockResponse();
      
      // Act & Assert
      await expect(middleware.use(req, res, mockNextFunction)).rejects.toThrow(
        new HttpException(
          'Business subscription not found',
          HttpStatus.BAD_REQUEST,
        )
      );
      
      expect(mockPrismaService.invite.count).not.toHaveBeenCalled();
      expect(mockNextFunction).not.toHaveBeenCalled();
    });
  });
}); 