import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan } from '@prisma/client';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeSubscriptionService {
  private readonly logger = new Logger(StripeSubscriptionService.name);

  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new subscription
   */
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    organizationId: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        trial_period_days: params.trialDays,
        metadata: {
          organizationId: params.organizationId,
          ...params.metadata,
        },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update local database
      await this.syncSubscriptionToDatabase(subscription, params.organizationId);

      this.logger.log(`Created subscription: ${subscription.id} for organization: ${params.organizationId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    subscriptionId: string,
    params: {
      priceId?: string;
      metadata?: Record<string, string>;
      prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
    },
  ): Promise<Stripe.Subscription> {
    try {
      const updateData: Stripe.SubscriptionUpdateParams = {
        metadata: params.metadata,
        proration_behavior: params.prorationBehavior || 'create_prorations',
      };

      if (params.priceId) {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        updateData.items = [
          {
            id: subscription.items.data[0].id,
            price: params.priceId,
          },
        ];
      }

      const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, updateData);

      // Update local database
      const organizationId = updatedSubscription.metadata?.organizationId;
      if (organizationId) {
        await this.syncSubscriptionToDatabase(updatedSubscription, organizationId);
      }

      this.logger.log(`Updated subscription: ${subscriptionId}`);
      return updatedSubscription;
    } catch (error) {
      this.logger.error(`Failed to update subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    params?: {
      immediately?: boolean;
      cancelAtPeriodEnd?: boolean;
    },
  ): Promise<Stripe.Subscription> {
    try {
      let subscription: Stripe.Subscription;

      if (params?.immediately) {
        subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: params?.cancelAtPeriodEnd ?? true,
        });
      }

      // Update local database
      const organizationId = subscription.metadata?.organizationId;
      if (organizationId) {
        await this.syncSubscriptionToDatabase(subscription, organizationId);
      }

      this.logger.log(`Cancelled subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve subscription by ID
   */
  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['customer', 'latest_invoice', 'items.data.price'],
      });
    } catch (error) {
      this.logger.error(`Failed to retrieve subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * List subscriptions for a customer
   */
  async listCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        expand: ['data.items.data.price'],
      });
      return subscriptions.data;
    } catch (error) {
      this.logger.error(`Failed to list customer subscriptions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync Stripe subscription to local database
   */
  async syncSubscriptionToDatabase(subscription: Stripe.Subscription, organizationId: string): Promise<void> {
    try {
      const plan = this.mapStripePriceToPlan(subscription.items.data[0]?.price?.id);
      
      await this.prisma.subscription.upsert({
        where: { organizationId },
        update: {
          stripeSubscriptionId: subscription.id,
          plan,
          status: subscription.status,
          currentPeriodStart: (subscription as any).current_period_start 
            ? new Date((subscription as any).current_period_start * 1000)
            : null,
          currentPeriodEnd: (subscription as any).current_period_end 
            ? new Date((subscription as any).current_period_end * 1000)
            : null,
          updatedAt: new Date(),
        },
        create: {
          organizationId,
          stripeSubscriptionId: subscription.id,
          plan,
          status: subscription.status,
          currentPeriodStart: (subscription as any).current_period_start 
            ? new Date((subscription as any).current_period_start * 1000)
            : null,
          currentPeriodEnd: (subscription as any).current_period_end 
            ? new Date((subscription as any).current_period_end * 1000)
            : null,
          usageLimits: {},
          inviteLimit: this.getInviteLimitForPlan(plan),
        },
      });

      this.logger.log(`Synced subscription to database: ${subscription.id}`);
    } catch (error) {
      this.logger.error(`Failed to sync subscription to database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map Stripe price ID to subscription plan
   */
  private mapStripePriceToPlan(priceId?: string): SubscriptionPlan {
    const plans = this.configService.get('stripe.plans');
    
    if (priceId === plans?.starter?.priceId) {
      return SubscriptionPlan.STARTER;
    }
    if (priceId === plans?.growth?.priceId) {
      return SubscriptionPlan.GROWTH;
    }
    if (priceId === plans?.pro?.priceId) {
      return SubscriptionPlan.PRO;
    }
    
    return SubscriptionPlan.FREE;
  }

  /**
   * Get invite limit based on plan
   */
  private getInviteLimitForPlan(plan: SubscriptionPlan): number {
    const plans = this.configService.get('stripe.plans');
    
    switch (plan) {
      case SubscriptionPlan.FREE:
        return plans?.free?.inviteLimit || 5;
      case SubscriptionPlan.STARTER:
        return plans?.starter?.inviteLimit || 30;
      case SubscriptionPlan.GROWTH:
        return plans?.growth?.inviteLimit || 200;
      case SubscriptionPlan.PRO:
        // Use soft limit for pro plan to prevent spam
        return this.configService.get('stripe.proSoftLimit') || 10000;
      default:
        return 5;
    }
  }

  /**
   * Get subscription by organization ID
   */
  async getSubscriptionByOrganization(organizationId: string): Promise<Stripe.Subscription | null> {
    try {
      const dbSubscription = await this.prisma.subscription.findUnique({
        where: { organizationId },
      });

      if (!dbSubscription?.stripeSubscriptionId) {
        return null;
      }

      return await this.retrieveSubscription(dbSubscription.stripeSubscriptionId);
    } catch (error) {
      this.logger.error(`Failed to get subscription by organization: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if subscription is active
   */
  isSubscriptionActive(subscription: Stripe.Subscription): boolean {
    return ['active', 'trialing', 'past_due'].includes(subscription.status);
  }

  /**
   * Check if subscription is cancelled
   */
  isSubscriptionCancelled(subscription: Stripe.Subscription): boolean {
    return ['canceled', 'unpaid'].includes(subscription.status);
  }

  /**
   * Get subscription plan from Stripe subscription
   */
  getSubscriptionPlan(subscription: Stripe.Subscription): SubscriptionPlan {
    const priceId = subscription.items.data[0]?.price?.id;
    return this.mapStripePriceToPlan(priceId);
  }
} 