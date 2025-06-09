import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateInviteDto, CreateBatchInviteDto } from './dto/create-invite.dto';
import { InviteStatus } from '@prisma/client';
import { SmsJobData } from '../types/sms-job.interface';
import { createUniqueShortId } from '../common/utils/short-id.util';

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    @InjectQueue('sms') private smsQueue: Queue,
  ) {}

  async create(
    businessId: string,
    organizationId: string,
    createInviteDto: CreateInviteDto,
  ) {
    const { customerId, message, sendAt } = createInviteDto;

    // Verify customer exists and belongs to business
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId,
      },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer not found or does not belong to this business`,
      );
    }

    // Create a token for the invite
    const token = crypto.randomBytes(20).toString('hex');

    // Generate unique short ID
    const shortId = await createUniqueShortId(async (id: string) => {
      const existing = await this.prisma.invite.findFirst({
        where: { shortId: id },
      });
      return !!existing;
    });

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
        shortId,
        expiresAt,
        sendAt: scheduledSendTime,
        status: InviteStatus.PENDING,
      },
    });

    this.logger.log(
      `Created invite for customer ${customerId}: ${invite.id} (shortId: ${shortId})${scheduledSendTime ? ` scheduled for ${scheduledSendTime.toISOString()}` : ''}`,
    );

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
    const job = await this.smsQueue.add('send', smsJobData);

    this.logger.log(
      `Enqueued SMS job with ID: ${job.id}${jobDelay > 0 ? ` with ${Math.round(jobDelay / 1000 / 60)} minute delay` : ''}`,
    );

    return {
      inviteId: invite.id,
      jobId: job.id,
      ...(scheduledSendTime && {
        scheduledFor: scheduledSendTime.toISOString(),
      }),
    };
  }

  async createBatch(
    businessId: string,
    organizationId: string,
    createBatchInviteDto: CreateBatchInviteDto,
  ) {
    const { customerIds, message, sendAt } = createBatchInviteDto;

    // Verify all customers exist and belong to business
    const customers = await this.prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        businessId,
      },
    });

    if (customers.length !== customerIds.length) {
      const foundIds = customers.map((c) => c.id);
      const missingIds = customerIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Customers not found or do not belong to this business: ${missingIds.join(', ')}`,
      );
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

    // Generate unique short IDs for all invites
    const shortIds: string[] = [];
    for (let i = 0; i < customerIds.length; i++) {
      const shortId = await createUniqueShortId(async (id: string) => {
        // Check against existing invites in database
        const existing = await this.prisma.invite.findFirst({
          where: { shortId: id },
        });
        if (existing) return true;

        // Also check against already generated short IDs in this batch
        return shortIds.includes(id);
      });
      shortIds.push(shortId);
    }

    // Prepare invite data for batch creation
    const inviteData = customerIds.map((customerId, index) => ({
      businessId,
      organizationId,
      customerId,
      token: crypto.randomBytes(20).toString('hex'),
      shortId: shortIds[index],
      expiresAt,
      sendAt: scheduledSendTime,
      status: InviteStatus.PENDING,
    }));

    // Create all invites and return them in a single operation
    const createdInvites = await this.prisma.invite.createManyAndReturn({
      data: inviteData,
    });

    this.logger.log(
      `Created ${createdInvites.length} invites for batch request (shortIds: ${shortIds.join(', ')})${scheduledSendTime ? ` scheduled for ${scheduledSendTime.toISOString()}` : ''}`,
    );

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
    }));

    // Enqueue all SMS jobs in batch
    const jobs = await this.smsQueue.addBulk(smsJobs);

    this.logger.log(
      `Enqueued ${jobs.length} SMS jobs for batch invites${baseDelay > 0 ? ` with ${Math.round(baseDelay / 1000 / 60)} minute base delay` : ''}`,
    );

    return {
      invitesCreated: createdInvites.length,
      jobIds: jobs.map((job) => job.id),
      inviteIds: createdInvites.map((invite) => invite.id),
      ...(scheduledSendTime && {
        scheduledFor: scheduledSendTime.toISOString(),
      }),
    };
  }

  async getInviteStatus(id: string) {
    const smsLog = await this.prisma.smsLog.findFirst({
      select: {
        inviteId: true,
        status: true,
        message: true,
      },
      where: {
        inviteId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!smsLog) {
      throw new NotFoundException('SMS log not found');
    }

    const response = {
      id: smsLog.inviteId,
      status: smsLog.status,
      message: smsLog.message,
    };

    return response;
  }
}
