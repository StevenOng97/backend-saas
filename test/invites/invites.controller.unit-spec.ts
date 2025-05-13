import { Test, TestingModule } from '@nestjs/testing';
import { InvitesController } from '../../src/invites/invites.controller';
import { InvitesService } from '../../src/invites/invites.service';
import { HttpStatus } from '@nestjs/common';
import { CreateInviteDto } from '../../src/invites/dto/create-invite.dto';

describe('InvitesController', () => {
  let controller: InvitesController;
  let service: InvitesService;

  const mockInvitesService = {
    create: jest.fn(),
  };

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.req = {
      business: { id: 'business-id' },
    };
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitesController],
      providers: [
        {
          provide: InvitesService,
          useValue: mockInvitesService,
        },
      ],
    }).compile();

    controller = module.get<InvitesController>(InvitesController);
    service = module.get<InvitesService>(InvitesService);
    
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createInviteDto: CreateInviteDto = {
      customerId: 'customer-id',
      message: 'Test invitation message',
    };
    
    const serviceResult = {
      inviteId: 'invite-id',
      jobId: 'job-id',
    };

    it('should create an invite when business ID is present', async () => {
      // Arrange
      const res = mockResponse();
      mockInvitesService.create.mockResolvedValue(serviceResult);
      
      // Act
      await controller.create(createInviteDto, res);
      
      // Assert
      expect(mockInvitesService.create).toHaveBeenCalledWith(
        'business-id',
        createInviteDto,
      );
      expect(res.status).toHaveBeenCalledWith(HttpStatus.ACCEPTED);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invite created and SMS queued for delivery',
        ...serviceResult,
      });
    });

    it('should return bad request when business ID is missing', async () => {
      // Arrange
      const res = mockResponse();
      res.req.business = null;
      
      // Act
      await controller.create(createInviteDto, res);
      
      // Assert
      expect(mockInvitesService.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Business ID not found in request',
      });
    });
  });
}); 