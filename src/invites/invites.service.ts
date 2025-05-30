import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateInviteDto, CreateBatchInviteDto } from './dto/create-invite.dto';
import { InviteStatus } from '@prisma/client';
import { SmsJobData } from '../types/sms-job.interface';

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    @InjectQueue('sms') private smsQueue: Queue,
  ) {}

  async create(businessId: string, organizationId: string, createInviteDto: CreateInviteDto) {
    const { customerId, message, sendAt } = createInviteDto;

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

    // Parse sendAt if provided and validate it's in the future
    let scheduledSendTime: Date | null = null;
    if (sendAt) {
      scheduledSendTime = new Date(sendAt);
      if (scheduledSendTime <= new Date()) {
        throw new NotFoundException('sendAt must be a future date');
      }
    }

    // Create invite record
    const invite = await this.prisma.invite.create({
      data: {
        businessId,
        organizationId,
        customerId,
        token,
        expiresAt,
        sendAt: scheduledSendTime,
        status: InviteStatus.PENDING,
      },
    });

    this.logger.log(`Created invite for customer ${customerId}: ${invite.id}${scheduledSendTime ? ` scheduled for ${scheduledSendTime.toISOString()}` : ''}`);

    // Send invite email if email is provided
    // if (email) {
    //   await this.mailService.sendInviteEmail(
    //     email,
    //     token,
    //     message || 'You have been invited to join our platform.'
    //   );
    //   this.logger.log(`Invite email sent to ${email}`);
    // }

    // Prepare SMS job data with proper typing
    const smsJobData: SmsJobData = {
      businessId,
      customerId,
      inviteId: invite.id,
      message: message || '',
    };

    // Calculate delay if scheduled
    let jobDelay = 0;
    if (scheduledSendTime) {
      jobDelay = scheduledSendTime.getTime() - Date.now();
      if (jobDelay < 0) jobDelay = 0; // Failsafe, send immediately if past due
    }

    // Enqueue SMS job with optional delay
    const job = await this.smsQueue.add(
      'send',
      smsJobData,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 seconds
        },
        delay: jobDelay, // Schedule for the specified time
      },
    );

    this.logger.log(`Enqueued SMS job with ID: ${job.id}${jobDelay > 0 ? ` with ${Math.round(jobDelay/1000/60)} minute delay` : ''}`);

    return {
      inviteId: invite.id,
      jobId: job.id,
      ...(scheduledSendTime && { scheduledFor: scheduledSendTime.toISOString() }),
    };
  }

  async createBatch(businessId: string, organizationId: string, createBatchInviteDto: CreateBatchInviteDto) {
    const { customerIds, message, sendAt } = createBatchInviteDto;

    // Verify all customers exist and belong to business
    const customers = await this.prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        businessId,
      },
    });

    if (customers.length !== customerIds.length) {
      const foundIds = customers.map(c => c.id);
      const missingIds = customerIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Customers not found or do not belong to this business: ${missingIds.join(', ')}`);
    }

    // Set expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Parse sendAt if provided and validate it's in the future
    let scheduledSendTime: Date | null = null;
    if (sendAt) {
      scheduledSendTime = new Date(sendAt);
      if (scheduledSendTime <= new Date()) {
        throw new NotFoundException('sendAt must be a future date');
      }
    }

    // Prepare invite data for batch creation
    const inviteData = customerIds.map(customerId => ({
      businessId,
      organizationId,
      customerId,
      token: crypto.randomBytes(20).toString('hex'),
      expiresAt,
      sendAt: scheduledSendTime,
      status: InviteStatus.PENDING,
    }));

    // Create all invites and return them in a single operation
    const createdInvites = await this.prisma.invite.createManyAndReturn({
      data: inviteData,
    });

    this.logger.log(`Created ${createdInvites.length} invites for batch request${scheduledSendTime ? ` scheduled for ${scheduledSendTime.toISOString()}` : ''}`);

    // Calculate base delay if scheduled
    let baseDelay = 0;
    if (scheduledSendTime) {
      baseDelay = scheduledSendTime.getTime() - Date.now();
      if (baseDelay < 0) baseDelay = 0; // Failsafe, send immediately if past due
    }

    // Prepare SMS jobs for all invites
    const smsJobs = createdInvites.map((invite, index) => ({
      name: 'send',
      data: {
        businessId,
        customerId: invite.customerId,
        inviteId: invite.id,
        message,
      } as SmsJobData,
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 seconds
        },
      },
      // If scheduled, use baseDelay + staggered intervals
      // If not scheduled, just use staggered intervals
      delay: baseDelay + (index * 2000), // 2s interval between each SMS
    }));

    // Enqueue all SMS jobs in batch
    const jobs = await this.smsQueue.addBulk(smsJobs);

    this.logger.log(`Enqueued ${jobs.length} SMS jobs for batch invites${baseDelay > 0 ? ` with ${Math.round(baseDelay/1000/60)} minute base delay` : ''}`);

    return {
      invitesCreated: createdInvites.length,
      jobIds: jobs.map(job => job.id),
      inviteIds: createdInvites.map(invite => invite.id),
      ...(scheduledSendTime && { scheduledFor: scheduledSendTime.toISOString() }),
    };
  }
} 