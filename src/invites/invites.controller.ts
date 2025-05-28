import { Controller, Post, Body, Res, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { Response } from 'express';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InviteLimitGuard } from '../guards/invite-limit.guard';

@Controller('invites')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  // @UseGuards(InviteLimitGuard) // Check invite limits after authentication
  async create(@Body() createInviteDto: CreateInviteDto, @Request() req, @Res() res: Response) {
    // Get the business ID from the authenticated user
    const businessId = req.user?.businessId;
    
    if (!businessId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Business ID not found in user profile',
      });
    }

    const result = await this.invitesService.create(
      businessId,
      req.user.organizationId,
      createInviteDto,
    );

    return res.status(HttpStatus.ACCEPTED).json({
      message: 'Invite created and SMS queued for delivery',
      ...result,
    });
  }
} 