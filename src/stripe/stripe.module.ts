import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service'
import { StripeCustomerService } from './stripe-customer.service'
import { StripeSubscriptionService } from './stripe-subscription.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripeController } from './stripe.controller'
import { PrismaModule } from '../prisma/prisma.module';
import stripeConfig from '../config/stripe.config';
import Stripe from 'stripe';

@Module({
  imports: [
    ConfigModule.forFeature(stripeConfig),
    PrismaModule,
  ],
  providers: [
    {
      provide: 'STRIPE_CLIENT',
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.get<string>('stripe.secretKey');
        if (!secretKey) {
          throw new Error('Stripe secret key is required');
        }
        return new Stripe(secretKey, {
          apiVersion: '2025-05-28.basil',
          appInfo: {
            name: 'Backend Dev SaaS',
            version: '1.0.0',
          },
        });
      },
      inject: [ConfigService],
    },
    StripeService,
    StripeCustomerService,
    StripeSubscriptionService,
    StripeWebhookService,
  ],
  controllers: [StripeController],
  exports: [
    StripeService,
    StripeCustomerService,
    StripeSubscriptionService,
    StripeWebhookService,
    'STRIPE_CLIENT',
  ],
})
export class StripeModule {} 