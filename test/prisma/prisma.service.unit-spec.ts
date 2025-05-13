import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';

// Mock the client
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

describe('PrismaService', () => {
  let service: PrismaService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call $connect on module init', async () => {
    // Arrange
    const connectSpy = jest.spyOn(service, '$connect');
    
    // Act
    await service.onModuleInit();
    
    // Assert
    expect(connectSpy).toHaveBeenCalled();
  });

  it('should call $disconnect on module destroy', async () => {
    // Arrange
    const disconnectSpy = jest.spyOn(service, '$disconnect');
    
    // Act
    await service.onModuleDestroy();
    
    // Assert
    expect(disconnectSpy).toHaveBeenCalled();
  });
}); 