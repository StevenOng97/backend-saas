# Stripe Integration

This module provides comprehensive Stripe integration for subscription management, payment processing, and webhook handling.

## Features

- **Customer Management**: Create and manage Stripe customers
- **Subscription Management**: Handle subscription lifecycle (create, update, cancel)
- **Webhook Processing**: Process Stripe webhook events
- **Checkout Sessions**: Create secure payment flows
- **Customer Portal**: Allow customers to manage their billing

## Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CURRENCY="usd"

# Stripe Price IDs (create these in your Stripe dashboard)
STRIPE_FREE_PRICE_ID=""
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."

# Application URLs
APP_FRONTEND_URL="http://localhost:3000"
APP_BACKEND_URL="http://localhost:3001"
```

## Setup Instructions

### 1. Create Stripe Products and Prices

In your Stripe Dashboard:

1. Go to Products → Create Product
2. Create products for each plan (Free, Starter, Pro)
3. Add recurring prices for each product
4. Copy the price IDs to your environment variables

### 2. Configure Webhooks

1. Go to Developers → Webhooks in Stripe Dashboard
2. Add endpoint: `https://yourdomain.com/stripe/webhook`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 3. Test with Stripe CLI

```bash
# Install Stripe CLI
npm install -g stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3001/stripe/webhook

# Trigger test events
stripe trigger customer.subscription.created
```

## API Endpoints

### Create Checkout Session
```http
POST /stripe/create-checkout-session
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "priceId": "price_...",
  "trialDays": 7
}
```

### Create Customer Portal Session
```http
POST /stripe/create-portal-session
Authorization: Bearer <jwt-token>
```

### Get Subscription Status
```http
GET /stripe/subscription
Authorization: Bearer <jwt-token>
```

### Cancel Subscription
```http
POST /stripe/subscription/:subscriptionId/cancel
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "immediately": false
}
```

### Get Available Plans
```http
GET /stripe/plans
```

### Webhook Endpoint
```http
POST /stripe/webhook
Stripe-Signature: <stripe-signature>
```

## Usage Examples

### Frontend Integration

```typescript
// Create checkout session
const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    priceId: 'price_starter_monthly',
    trialDays: 7
  })
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe Checkout
```

```typescript
// Create customer portal session
const response = await fetch('/api/stripe/create-portal-session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { url } = await response.json();
window.location.href = url; // Redirect to Customer Portal
```

### Backend Service Usage

```typescript
// Inject services
constructor(
  private readonly stripeCustomerService: StripeCustomerService,
  private readonly stripeSubscriptionService: StripeSubscriptionService,
) {}

// Create customer
const customer = await this.stripeCustomerService.createOrRetrieveCustomer(
  user,
  organizationId
);

// Get subscription
const subscription = await this.stripeSubscriptionService.getSubscriptionByOrganization(
  organizationId
);

// Check if subscription is active
const isActive = this.stripeSubscriptionService.isSubscriptionActive(subscription);
```

## Webhook Events Handled

- **customer.subscription.created**: Sync new subscription to database
- **customer.subscription.updated**: Update subscription in database
- **customer.subscription.deleted**: Handle cancellation, downgrade features
- **customer.subscription.trial_will_end**: Send trial ending notifications
- **invoice.payment_succeeded**: Handle successful payments
- **invoice.payment_failed**: Handle failed payments, send notifications
- **checkout.session.completed**: Handle successful checkouts

## Database Integration

The module automatically syncs Stripe subscription data with your local database:

- Maps Stripe price IDs to subscription plans
- Updates subscription status and billing periods
- Manages usage limits based on plan
- Handles plan upgrades and downgrades

## Error Handling

All services include comprehensive error handling and logging:

- Stripe API errors are caught and re-thrown with context
- Webhook signature verification failures are logged
- Database sync errors are handled gracefully
- All operations are logged for debugging

## Security

- Webhook signatures are verified using Stripe's signing secret
- User authorization is required for all subscription operations
- Organization-level access control prevents cross-tenant access
- Sensitive operations are logged for audit trails

## Testing

Use Stripe's test mode and test cards:

```typescript
// Test card numbers
const testCards = {
  visa: '4242424242424242',
  visaDebit: '4000056655665556',
  mastercard: '5555555555554444',
  declined: '4000000000000002'
};
```

## Monitoring

Monitor your Stripe integration:

- Check webhook delivery in Stripe Dashboard
- Monitor subscription metrics
- Set up alerts for failed payments
- Track subscription churn and growth 