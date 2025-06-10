import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { User } from '@prisma/client';

@Injectable()
export class StripeCustomerService {
  private readonly logger = new Logger(StripeCustomerService.name);

  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create or retrieve Stripe customer for a user
   */
  async createOrRetrieveCustomer(user: User, organizationId: string): Promise<Stripe.Customer> {
    try {
      // Check if organization already has a Stripe customer
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: { subscription: true },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // If organization has subscription with Stripe customer ID, retrieve it
      if (organization.subscription?.stripeSubscriptionId) {
        const subscription = await this.stripe.subscriptions.retrieve(
          organization.subscription.stripeSubscriptionId
        );
        if (subscription.customer && typeof subscription.customer === 'string') {
          const customer = await this.stripe.customers.retrieve(subscription.customer);
          if (!customer.deleted) {
            return customer as Stripe.Customer;
          }
        }
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
        metadata: {
          userId: user.id,
          organizationId: organizationId,
        },
      });

      this.logger.log(`Created Stripe customer: ${customer.id} for user: ${user.id}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to create/retrieve customer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update customer information
   */
  async updateCustomer(customerId: string, updates: Partial<Stripe.CustomerUpdateParams>): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, updates);
      this.logger.log(`Updated Stripe customer: ${customerId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to update customer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve customer by ID
   */
  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        throw new NotFoundException('Customer was deleted');
      }
      return customer as Stripe.Customer;
    } catch (error) {
      this.logger.error(`Failed to retrieve customer: ${error.message}`);
      throw error;
    }
  }

  /**
   * List customer's payment methods
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return paymentMethods.data;
    } catch (error) {
      this.logger.error(`Failed to list payment methods: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      this.logger.log(`Set default payment method for customer: ${customerId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to set default payment method: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a customer (careful with this)
   */
  async deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
    try {
      const deletedCustomer = await this.stripe.customers.del(customerId);
      this.logger.log(`Deleted Stripe customer: ${customerId}`);
      return deletedCustomer;
    } catch (error) {
      this.logger.error(`Failed to delete customer: ${error.message}`);
      throw error;
    }
  }
} 