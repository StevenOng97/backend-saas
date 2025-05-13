import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthMiddleware } from '../../src/middleware/auth.middleware';
import { PrismaService } from '../../src/prisma/prisma.service';
import { mockPrismaService } from '../mocks/prisma.mock';
import { mockJwtService } from '../mocks/jwt.mock';

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthMiddleware,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    middleware = module.get<AuthMiddleware>(AuthMiddleware);
    
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    const mockNextFunction = jest.fn();
    const mockResponse = {} as any;

    // Mock data
    const validToken = 'valid-token';
    const decodedToken = { sub: 'user-id' };
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      business: {
        id: 'business-id',
        name: 'Test Business',
        subscription: {
          id: 'subscription-id',
          plan: 'BASIC',
          inviteLimit: 10,
        },
      },
    };

    it('should authenticate user with valid token and attach user and business to request', async () => {
      // Arrange
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as any;
      
      mockJwtService.verify.mockReturnValue(decodedToken);
      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      
      // Act
      await middleware.use(req, mockResponse, mockNextFunction);
      
      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith(validToken);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: decodedToken.sub },
        include: {
          business: {
            include: {
              subscription: true,
            },
          },
        },
      });
      
      expect(req['user']).toEqual(mockUser);
      expect(req['business']).toEqual(mockUser.business);
      expect(mockNextFunction).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
      // Arrange
      const req = {
        headers: {},
      } as any;
      
      // Act & Assert
      await expect(middleware.use(req, mockResponse, mockNextFunction)).rejects.toThrow(
        new UnauthorizedException('Missing or invalid authorization token')
      );
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid Bearer format', async () => {
      // Arrange
      const req = {
        headers: {
          authorization: 'InvalidFormat',
        },
      } as any;
      
      // Act & Assert
      await expect(middleware.use(req, mockResponse, mockNextFunction)).rejects.toThrow(
        new UnauthorizedException('Missing or invalid authorization token')
      );
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when JWT verification fails', async () => {
      // Arrange
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as any;
      
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Act & Assert
      await expect(middleware.use(req, mockResponse, mockNextFunction)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as any;
      
      mockJwtService.verify.mockReturnValue(decodedToken);
      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue(null);
      
      // Act & Assert
      await expect(middleware.use(req, mockResponse, mockNextFunction)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should not attach business to request when user has no business', async () => {
      // Arrange
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as any;
      
      const userWithoutBusiness = {
        id: 'user-id',
        email: 'test@example.com',
        business: null,
      };
      
      mockJwtService.verify.mockReturnValue(decodedToken);
      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue(userWithoutBusiness);
      
      // Act
      await middleware.use(req, mockResponse, mockNextFunction);
      
      // Assert
      expect(req['user']).toEqual(userWithoutBusiness);
      expect(req['business']).toBeUndefined();
      expect(mockNextFunction).toHaveBeenCalled();
    });
  });
}); 