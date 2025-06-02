import * as crypto from 'crypto';
import prisma from '../lib/prisma';
import { SubscriptionPlan, UserRole, CustomerStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  console.log('Starting database seeding...');
  
  try {
    // Query all invites with their associated customers
    const invites = await prisma.invite.findMany({
      include: {
        customer: true
      }
    });
    
    console.log(`Found ${invites.length} invites in the database`);
    
    let updatedCount = 0;
    
    // Process each invite
    for (const invite of invites) {
      // If the invite has a customer (invite became a customer)
      if (invite.customerId && invite.customer) {
        // Update the customer status to REQUEST_SENT
        await prisma.customer.update({
          where: {
            id: invite.customerId
          },
          data: {
            status: CustomerStatus.REQUEST_SENT
          }
        });
        
        updatedCount++;
        console.log(`Updated customer ${invite.customer.name || invite.customer.email || invite.customerId} status to REQUEST_SENT`);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} customers' status to REQUEST_SENT`);
    console.log('Database seeding completed!');
    
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
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
