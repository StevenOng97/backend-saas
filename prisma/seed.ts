import * as crypto from 'crypto';
import prisma from '../lib/prisma';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  console.log('Seeding the database...');

  // Clean up existing data if any
  await prisma.smsLog.deleteMany({});
  await prisma.invite.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.business.deleteMany({});

  // Create a business
  const business = await prisma.business.create({
    data: {
      name: 'Demo Business',
      email: 'demo@business.com',
      phone: '+1234567890',
    },
  });

  console.log('Created business:', business);

  // Create a subscription for the business
  const subscription = await prisma.subscription.create({
    data: {
      businessId: business.id,
      plan: SubscriptionPlan.STARTER,
      status: 'active',
      inviteLimit: 3,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  console.log('Created subscription:', subscription);

  const password = 'Test@1234';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a user for the business
  const user = await prisma.user.create({
    data: {
      authId: crypto.randomUUID(),
      email: 'owner@business.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      businessId: business.id,
    },
  });

  console.log('Created user:', user);

  // Create two customers for the business
  const customer1 = await prisma.customer.create({
    data: {
      businessId: business.id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+11234567890',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      businessId: business.id,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+19876543210',
    },
  });

  console.log('Created customers:', customer1, customer2);

  console.log('Database seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
