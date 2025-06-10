import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeSubscriptionService } from './stripe-subscription.service';
import Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeSubscriptionService: StripeSubscriptionService,
  ) {}

  /**
   * Handle webhook events from Stripe
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.created':
          await this.handleCustomerCreated(event.data.object as Stripe.Customer);
          break;

        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;

        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook event ${event.type}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Subscription created: ${subscription.id}`);
    
    const organizationId = subscription.metadata?.organizationId;
    if (organizationId) {
      await this.stripeSubscriptionService.syncSubscriptionToDatabase(subscription, organizationId);
      
      // Additional business logic can be added here
      // e.g., send welcome email, unlock features, etc.
    }
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Subscription updated: ${subscription.id}`);
    
    const organizationId = subscription.metadata?.organizationId;
    if (organizationId) {
      await this.stripeSubscriptionService.syncSubscriptionToDatabase(subscription, organizationId);
      
      // Additional business logic for subscription changes
      // e.g., update usage limits, send notifications, etc.
    }
  }

  /**
   * Handle subscription deleted/cancelled
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Subscription deleted: ${subscription.id}`);
    
    const organizationId = subscription.metadata?.organizationId;
    if (organizationId) {
      await this.stripeSubscriptionService.syncSubscriptionToDatabase(subscription, organizationId);
      
      // Additional business logic for cancellation
      // e.g., downgrade features, send retention emails, etc.
      await this.handleSubscriptionCancellation(organizationId);
    }
  }

  /**
   * Handle trial will end
   */
  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Trial will end for subscription: ${subscription.id}`);
    
    const organizationId = subscription.metadata?.organizationId;
    if (organizationId) {
      // Send trial ending notification
      await this.sendTrialEndingNotification(organizationId, subscription);
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Payment succeeded for invoice: ${invoice.id}`);
    
    // Check if invoice has a subscription
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
    if (subscriptionId) {
      // Update subscription if needed
      // Additional business logic for successful payment
      this.logger.log(`Payment succeeded for subscription: ${subscriptionId}`);
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Payment failed for invoice: ${invoice.id}`);
    
    // Check if invoice has a subscription
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
    if (subscriptionId) {
      // Handle failed payment
      // e.g., send dunning emails, restrict access, etc.
      await this.handleFailedPaymentForSubscription(subscriptionId, invoice);
    }
  }

  /**
   * Handle checkout session completed
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    this.logger.log(`Checkout completed: ${session.id}`);
    
    if (session.subscription && typeof session.subscription === 'string') {
      // Handle successful checkout
      // The subscription webhook will handle the actual subscription logic
    }
  }

  /**
   * Handle customer created
   */
  private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    this.logger.log(`Customer created: ${customer.id}`);
    
    // Additional business logic for new customer
  }

  /**
   * Handle customer updated
   */
  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    this.logger.log(`Customer updated: ${customer.id}`);
    
    // Sync customer data if needed
  }

  /**
   * Extract subscription ID from invoice
   */
  private getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
    // In Stripe's Invoice object, subscription can be a string ID or null
    if ('subscription' in invoice && invoice.subscription && typeof invoice.subscription === 'string') {
      return invoice.subscription;
    }
    return null;
  }

  /**
   * Handle subscription cancellation business logic
   */
  private async handleSubscriptionCancellation(organizationId: string): Promise<void> {
    try {
      // Downgrade to FREE plan limits
      await this.prisma.subscription.update({
        where: { organizationId },
        data: {
          plan: 'FREE',
          inviteLimit: 10,
          usageLimits: {},
        },
      });

      this.logger.log(`Downgraded organization ${organizationId} to FREE plan`);
    } catch (error) {
      this.logger.error(`Failed to handle subscription cancellation: ${error.message}`);
    }
  }

  /**
   * Send trial ending notification
   */
  private async sendTrialEndingNotification(organizationId: string, subscription: Stripe.Subscription): Promise<void> {
    try {
      // Get organization users
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: { users: true },
      });

      if (organization) {
        // Send notification to all users in the organization
        // This is where you'd integrate with your email service
        this.logger.log(`Would send trial ending notification to organization ${organizationId}`);
        
        // Example: Send email notification
        // await this.emailService.sendTrialEndingEmail(organization.users, subscription);
      }
    } catch (error) {
      this.logger.error(`Failed to send trial ending notification: ${error.message}`);
    }
  }

  /**
   * Handle failed payment for a specific subscription
   */
  private async handleFailedPaymentForSubscription(subscriptionId: string, invoice: Stripe.Invoice): Promise<void> {
    try {
      // Get the subscription and organization
      const subscription = await this.stripeSubscriptionService.retrieveSubscription(subscriptionId);
      const organizationId = subscription.metadata?.organizationId;
      
      if (organizationId) {
        // Send payment failure notification
        this.logger.log(`Would send payment failure notification to organization ${organizationId}`);
        
        // Example: Send email notification
        // await this.emailService.sendPaymentFailedEmail(organizationId, invoice);
      }
    } catch (error) {
      this.logger.error(`Failed to handle payment failure: ${error.message}`);
    }
  }
} 