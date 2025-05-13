import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteStatus } from '@prisma/client';
@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('sms') private smsQueue: Queue,
  ) {}

  async create(businessId: string, createInviteDto: CreateInviteDto) {
    const { customerId, message } = createInviteDto;

    // Verify customer exists and belongs to business
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer not found or does not belong to this business`);
    }

    // Create a token for the invite
    const token = crypto.randomBytes(20).toString('hex');
    
    // Set expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create invite record
    const invite = await this.prisma.invite.create({
      data: {
        businessId,
        customerId,
        token,
        expiresAt,
        status: InviteStatus.PENDING,
      },
    });

    this.logger.log(`Created invite for customer ${customerId}: ${invite.id}`);

    // Enqueue SMS job
    const job = await this.smsQueue.add(
      'send',
      {
        businessId,
        customerId,
        inviteId: invite.id,
        message,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 seconds
        },
      },
    );

    this.logger.log(`Enqueued SMS job with ID: ${job.id}`);

    return {
      inviteId: invite.id,
      jobId: job.id,
    };
  }
} 