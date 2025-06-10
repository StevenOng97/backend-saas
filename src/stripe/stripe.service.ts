import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get the Stripe client instance
   */
  getStripeClient(): Stripe {
    return this.stripe;
  }

  /**
   * Get configuration values
   */
  getConfig(key: string): any {
    return this.configService.get(`stripe.${key}`);
  }

  /**
   * Create a Stripe Checkout Session
   */
  async createCheckoutSession(params: {
    customerId?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    mode?: 'payment' | 'subscription' | 'setup';
    metadata?: Record<string, string>;
    allowPromotionCodes?: boolean;
    trialPeriodDays?: number;
    customerEmail?: string;
  }): Promise<Stripe.Checkout.Session> {
    try {
      // Default to 7-day trial for all paid plans unless explicitly set to 0
      const defaultTrialDays = this.getConfig('defaultTrialDays') || 7;
      const trialDays = params.trialPeriodDays !== undefined ? params.trialPeriodDays : defaultTrialDays;

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: params.customerId,
        customer_email: !params.customerId ? params.customerEmail : undefined,
        payment_method_types: ['card'],
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        mode: params.mode || 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata || {},
        allow_promotion_codes: params.allowPromotionCodes || true,
        billing_address_collection: 'required',
        automatic_tax: {
          enabled: false, // TODO: Enable this when we have a tax service
        },
      };

      // Add trial only for subscription mode and if trial days > 0
      if (sessionParams.mode === 'subscription' && trialDays > 0) {
        sessionParams.subscription_data = {
          trial_period_days: trialDays,
          metadata: params.metadata || {},
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      this.logger.log(`Created checkout session: ${session.id} with ${trialDays}-day trial`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create checkout session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a Customer Portal Session
   */
  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
      });

      this.logger.log(`Created portal session for customer: ${params.customerId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create portal session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve a checkout session
   */
  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer', 'subscription'],
      });
    } catch (error) {
      this.logger.error(`Failed to retrieve checkout session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Construct webhook event from request
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    endpointSecret: string,
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw error;
    }
  }
} 