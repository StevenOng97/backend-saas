import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  async create(@Body() createInviteDto: CreateInviteDto, @Res() res: Response) {
    // Get the business ID from the request object (set by auth middleware)
    const businessId = res.req['business']?.id;
    
    if (!businessId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Business ID not found in request',
      });
    }

    const result = await this.invitesService.create(businessId, createInviteDto);
    
    return res.status(HttpStatus.ACCEPTED).json({
      message: 'Invite created and SMS queued for delivery',
      ...result,
    });
  }
} 