# Backend Mini-Project: NestJS + Prisma + BullMQ

This is a NestJS backend implementation for the mini-project requirements. It implements a system for sending SMS invites through a queueing system with subscription plan limits.

## Technologies Used

- NestJS
- Prisma ORM (PostgreSQL)
- BullMQ + Upstash Redis (serverless Redis)
- JWT Authentication
- Resend for Email Delivery

## Setup Requirements

### Prerequisites

- Node.js (v18+)
- Supabase account
- Upstash Redis account
- Resend account

### Setting Up PostgreSQL & Redis

#### Supabase PostgreSQL Setup

1. Sign up for a free Supabase account at [Supabase](https://supabase.com/)
2. Create a new project
3. Navigate to Project Settings > Database to find your connection string
4. Copy the connection string and replace the password placeholder with your actual password
5. Add this connection string to your DATABASE_URL environment variable

#### Upstash Redis Setup

1. Sign up for an account at [Upstash](https://upstash.com/)
2. Create a new Redis database
3. Copy the REST API details (URL and Token)
4. Add these to your environment variables

### Setting Up Resend for Email Service

1. Sign up for a free account at [Resend](https://resend.com/)
2. Navigate to API Keys and create a new API key
3. Copy the API key and add it to your environment variables

### Setting Up Stripe for Billing

1. Sign up for a free account at [Stripe](https://stripe.com/)
2. Get your API keys from the Stripe Dashboard > Developers > API keys
3. Create the following products and prices in your Stripe Dashboard:
   - **Starter Plan**: $19/month recurring
   - **Growth Plan**: $49/month recurring  
   - **Pro Plan**: $99/month recurring
4. Copy the price IDs and add them to your environment variables
5. Set up a webhook endpoint pointing to `your-domain.com/stripe/webhook`
6. Copy the webhook signing secret and add it to your environment variables

### Environment Variables

Create a `.env` file in the root directory with the following contents:

```
# Supabase Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/backend_saas?schema=public"
PORT=4200
BACKEND_URL=http://localhost:4200

# JWT Auth
JWT_SECRET="super-secret-jwt-token-for-backend-saas"

# Upstash Redis
UPSTASH_REDIS_URL="https://your-endpoint.upstash.io"
UPSTASH_REDIS_TOKEN="your-upstash-token"
UPSTASH_REDIS_PORT=6379

# Mail Configuration
MAIL_FROM="no-reply@yourdomain.com"
FRONTEND_URL="http://localhost:3000"
RESEND_API_KEY="your-resend-api-key"

# Google OAuth (if using Google authentication)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4200/auth/google/callback"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_endpoint_secret"
STRIPE_CURRENCY="usd"

# Stripe Price IDs (create these in your Stripe Dashboard)
STRIPE_STARTER_PRICE_ID="price_starter_plan_id"
STRIPE_GROWTH_PRICE_ID="price_growth_plan_id"
STRIPE_PRO_PRICE_ID="price_pro_plan_id"
```

## Installation & Setup

1. Install dependencies:

```bash
npm install
```

2. Generate Prisma client:

```bash
npm run prisma:generate
```

3. Create and apply migrations:

```bash
npm run prisma:migrate
```

4. Seed the database with initial data:

```bash
npm run seed
```

5. Generate a JWT token for testing:

```bash
npm run generate:token
```

## Running the Application

1. Start the main application:

```bash
npm run start:dev
```

2. Start the BullMQ worker in a separate terminal:

```bash
npm run worker
```

## Why Upstash Redis?

The project now supports [Upstash Redis](https://upstash.com/), a serverless Redis service with several advantages:

- **Serverless**: No need to manage Redis servers
- **Scale to Zero**: Pay only for what you use
- **Global Replication**: Low latency access worldwide
- **REST API**: Access from any environment or runtime
- **Persistent Storage**: Data is automatically persisted
- **Simple Integration**: Easy to use with NestJS and BullMQ

## Why Supabase?

The project uses [Supabase](https://supabase.com/), a powerful open-source Firebase alternative with several advantages:

- **Hosted PostgreSQL**: Fully managed PostgreSQL database with automatic backups
- **Automatic API Generation**: Auto-generated RESTful and GraphQL APIs
- **Scalable**: Built for high-performance applications
- **Real-time Capabilities**: Built-in real-time subscriptions 
- **Easy Authentication**: Authentication and user management out of the box
- **Row-Level Security**: Fine-grained access control at the database level
- **Developer Experience**: Excellent dashboard, documentation, and client libraries

## Testing the API

### Sample JWT

Generate a JWT token for testing using:

```bash
npm run generate:token
```

Use the generated token in your API requests with the header:
```
Authorization: Bearer <token>
```

### API Endpoints

#### 1. Create Invite

```bash
curl -X POST http://localhost:4200/invites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "customerId": "<customer_id>",
    "message": "You are invited to our platform!"
  }'
```

Note: You can get a customer ID from the database after running the seed script.

#### 2. Simulate Twilio Webhook

After sending invites, run the Twilio webhook simulator:

```bash
npm run simulate:twilio
```

## Business Logic

- Each business has a subscription with an invite limit
- The system enforces the monthly invite limit
- SMS messages are sent through a queueing system
- Failed SMS attempts are retried with exponential backoff
- Webhook endpoint updates SMS status from 'queued' to 'delivered' or 'failed'

## Testing Scenarios

1. **Successful invite**: Send an invite with a valid customer ID
2. **Rate limit**: Send more than 3 invites (starter plan limit) to get a 429 response
3. **Webhook updates**: Run the simulator to update SMS statuses

## Testing

Run the unit tests with:

```bash
npm run test:unit
```

These tests are located in the `test` directory with the `.unit-spec.ts` suffix and test individual components in isolation with proper mocking.
