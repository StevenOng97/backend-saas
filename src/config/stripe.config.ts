import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  publicKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookEndpointSecret: process.env.STRIPE_WEBHOOK_SECRET,
  currency: process.env.STRIPE_CURRENCY || 'usd',
  plans: {
    starter: {
      name: 'Starter',
      price: 19,
      priceId: process.env.STRIPE_STARTER_PRICE_ID,
      features: ['All basic features', '30 monthly invites', 'Email & chat support', '7-day free trial'],
      inviteLimit: 30,
      description: 'Great for small businesses',
      cta: 'Start your free trial',
      popular: false,
    },
    growth: {
      name: 'Growth',
      price: 49,
      priceId: process.env.STRIPE_GROWTH_PRICE_ID,
      features: ['All starter features', '200 monthly invites', 'Advanced analytics', 'Priority support', '7-day free trial'],
      inviteLimit: 200,
      description: 'Perfect for growing businesses',
      cta: 'Start your free trial',
      popular: true,
    },
    pro: {
      name: 'Pro',
      price: 99,
      priceId: process.env.STRIPE_PRO_PRICE_ID,
      features: ['All growth features', 'Unlimited invites', 'White-label options', 'Dedicated account manager', '7-day free trial'],
      inviteLimit: -1, // -1 represents unlimited
      description: 'For enterprise-level operations',
      cta: 'Start your free trial',
      popular: false,
    },
  },
  // Default trial period for all paid plans
  defaultTrialDays: 7,
  // Soft limit for "unlimited" pro plan to prevent spam
  proSoftLimit: 10000,
})); 