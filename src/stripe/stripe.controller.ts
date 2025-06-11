import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  Res,
  Get,
  Param,
  BadRequestException,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { StripeService } from './stripe.service';
import { StripeCustomerService } from './stripe-customer.service';
import { StripeSubscriptionService } from './stripe-subscription.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { CreateCheckoutSessionDto, CancelSubscriptionDto } from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly stripeCustomerService: StripeCustomerService,
    private readonly stripeSubscriptionService: StripeSubscriptionService,
    private readonly stripeWebhookService: StripeWebhookService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a checkout session for subscription
   * Note: Add authentication middleware as needed
   */
  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Body() body: CreateCheckoutSessionDto,
    @CurrentUser() user: User,
  ) {
    try {
      // TODO: Extract user from JWT token or session
      // For now, this endpoint will need to be called with organizationId in body
      const { priceId, trialDays } = body as any;

      const organizationId = user.organizationId;
      const userEmail = user.email;

      if (!user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      // Create a mock user object - replace with actual user retrieval
      const mockUser: Partial<User> = {
        id: 'temp-user-id',
        email: userEmail,
        organizationId,
      };

      // Create or retrieve customer
      const customer =
        await this.stripeCustomerService.createOrRetrieveCustomer(
          mockUser as User,
          organizationId,
        );

      // Create checkout session
      const session = await this.stripeService.createCheckoutSession({
        customerId: customer.id,
        priceId: priceId,
        successUrl: `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/subscription/cancel`,
        metadata: {
          userId: mockUser.id!,
          organizationId: organizationId,
        },
        trialPeriodDays: trialDays,
      });

      return {
        url: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to create checkout session: ${error.message}`,
      );
    }
  }

  /**
   * Create a customer portal session
   * Note: Add authentication middleware as needed
   */
  @Post('create-portal-session')
  @UseGuards(JwtAuthGuard)
  async createPortalSession(@CurrentUser() user: User) {
    try {
      const organizationId = user.organizationId;
      const userEmail = user.email;

      if (!organizationId || !userEmail) {
        throw new BadRequestException(
          'Organization ID and user email are required',
        );
      }

      // Create a mock user object - replace with actual user retrieval
      const mockUser: Partial<User> = {
        id: 'temp-user-id',
        email: userEmail,
        organizationId,
      };

      // Get or create customer
      const customer =
        await this.stripeCustomerService.createOrRetrieveCustomer(
          mockUser as User,
          organizationId,
        );

      // Create portal session
      const session = await this.stripeService.createPortalSession({
        customerId: customer.id,
        returnUrl: `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/subscription`,
      });

      return {
        url: session.url,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to create portal session: ${error.message}`,
      );
    }
  }

  /**
   * Get subscription status
   * Note: Add authentication middleware as needed
   */
  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  async getSubscription(@CurrentUser() user: User) {
    try {
      const subscription =
        await this.stripeSubscriptionService.getSubscriptionByOrganization(
          user.organizationId,
        );

      if (!subscription) {
        return {
          plan: 'FREE',
          status: 'inactive',
          subscription: null,
        };
      }

      return {
        plan: this.stripeSubscriptionService.getSubscriptionPlan(subscription),
        status: subscription.status,
        subscription: {
          id: subscription.id,
          currentPeriodStart: (subscription as any).current_period_start,
          currentPeriodEnd: (subscription as any).current_period_end,
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
          trialEnd: (subscription as any).trial_end 
            ? new Date((subscription as any).trial_end * 1000).toISOString()
            : null,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get subscription: ${error.message}`,
      );
    }
  }

  /**
   * Cancel subscription
   */
  @Post('subscription/:subscriptionId/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: CancelSubscriptionDto,
    @CurrentUser() user: User,
  ) {
    try {
      // Verify subscription belongs to user's organization
      const subscription =
        await this.stripeSubscriptionService.retrieveSubscription(
          subscriptionId,
        );
      if (subscription.metadata?.organizationId !== user.organizationId) {
        throw new BadRequestException('Subscription not found');
      }

      const cancelledSubscription =
        await this.stripeSubscriptionService.cancelSubscription(
          subscriptionId,
          {
            immediately: body.immediately,
            cancelAtPeriodEnd: !body.immediately,
          },
        );

      return {
        success: true,
        subscription: {
          id: cancelledSubscription.id,
          status: cancelledSubscription.status,
          cancelAtPeriodEnd: cancelledSubscription.cancel_at_period_end,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to cancel subscription: ${error.message}`,
      );
    }
  }

  /**
   * Get available plans
   */
  @Get('plans')
  async getPlans() {
    const plans = this.configService.get('stripe.plans');
    if (!plans) {
      return { plans: [] };
    }

    return {
      plans: Object.entries(plans).map(([key, plan]: [string, any]) => ({
        id: key,
        name: plan.name,
        price: plan.price,
        priceId: plan.priceId,
        features: plan.features,
        inviteLimit: plan.inviteLimit,
        description: plan.description,
        isFree: plan.price === 0,
        hasFreeTrial: plan.price > 0,
        trialDays:
          plan.price > 0
            ? this.configService.get('stripe.defaultTrialDays') || 7
            : 0,
      })),
    };
  }

  /**
   * Handle Stripe webhooks
   */
  @Post('webhook')
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.log('🔄 Webhook received');
      this.logger.log('Has signature:', !!signature);
      this.logger.log('Body type:', typeof req.body);
      this.logger.log('Body is Buffer:', Buffer.isBuffer(req.body));

      // ALWAYS respond to Stripe first to prevent timeout
      if (!signature) {
        this.logger.log('❌ Missing signature');
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Missing stripe-signature header',
        });
      }

      const webhookSecret = this.configService.get<string>(
        'STRIPE_WEBHOOK_SECRET',
      );
      if (!webhookSecret) {
        this.logger.log('❌ Missing webhook secret');
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Webhook secret not configured',
        });
      }

      // Express raw middleware puts the raw buffer in req.body
      const rawBody = req.body;
      if (!rawBody || !Buffer.isBuffer(rawBody)) {
        this.logger.log('❌ Missing or invalid raw body');
        this.logger.log('Body:', req.body);
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Missing raw body for webhook signature verification',
        });
      }

      this.logger.log('🔐 Constructing webhook event...');
      const event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      this.logger.log('📝 Event type:', event.type);
      this.logger.log('🔄 Processing webhook event...');

      // Process the webhook event
      await this.stripeWebhookService.handleWebhookEvent(event);

      this.logger.log('✅ Webhook processed successfully');
      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      this.logger.error('❌ Webhook error:', error.message);
      this.logger.error('Error type:', error.constructor.name);

      if (error.type === 'StripeSignatureVerificationError') {
        this.logger.error('🔐 Signature verification failed');
      }

      // ALWAYS return a response to prevent timeout
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: error.message,
        type: error.constructor.name,
      });
    }
  }

  /**
   * Verify checkout session
   */
  @Get('verify-session/:sessionId')
  @UseGuards(JwtAuthGuard)
  async verifySession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: User,
  ) {
    try {
      const session =
        await this.stripeService.retrieveCheckoutSession(sessionId);

      // Verify session belongs to user's organization
      if (session.metadata?.organizationId !== user.organizationId) {
        throw new BadRequestException('Session not found');
      }

      return {
        session: {
          id: session.id,
          status: session.status,
          paymentStatus: session.payment_status,
          subscription: session.subscription,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to verify session: ${error.message}`,
      );
    }
  }
}
