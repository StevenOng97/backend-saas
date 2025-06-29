import { Controller, Post, Body, Res, HttpStatus, UseGuards, Request, Get, Param } from '@nestjs/common';
import { Response } from 'express';
import { InvitesService } from './invites.service';
import { CreateInviteDto, CreateBatchInviteDto } from './dto/create-invite.dto';
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
    console.log("User:", req.user)
    const businessId = req.user?.organization?.businesses[0]?.id ?? "";
    
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

  @Post('batch')
  // @UseGuards(InviteLimitGuard) // Check invite limits after authentication
  async createBatch(@Body() createBatchInviteDto: CreateBatchInviteDto, @Request() req, @Res() res: Response) {
    // Get the business ID from the authenticated user
    console.log("User:", req.user)
    const businessId = req.user?.organization?.businesses[0]?.id ?? "";
    
    if (!businessId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Business ID not found in user profile',
      });
    }

    const result = await this.invitesService.createBatch(
      businessId,
      req.user.organizationId,
      createBatchInviteDto,
    );

    return res.status(HttpStatus.ACCEPTED).json({
      message: `${result.invitesCreated} invites created and SMS jobs queued for delivery`,
      ...result,
    });
  }

  @Get('invite-status/:id') 
  async getInviteStatus(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const invite = await this.invitesService.getInviteStatus(id);
    return res.status(HttpStatus.OK).json(invite);
  }
} 