import * as crypto from 'crypto';
import prisma from '../lib/prisma';
import { SubscriptionPlan, UserRole, CustomerStatus, TemplateType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  console.log('Starting database seeding...');
  
  try {
    // Seed prebuilt SMS templates
    const smsTemplates = [
      {
        name: 'Standard Review Request',
        description: 'A standard template for requesting customer reviews',
        type: TemplateType.SMS,
        content: 'Hi {customerName}! Thanks for choosing us. We hope you had a great experience! Would you mind leaving us a review? {reviewLink} - {businessName}',
        isDefault: true,
        isPrebuilt: true,
      },
      {
        name: 'Follow-up Request',
        description: 'A follow-up template for requesting customer feedback',
        type: TemplateType.SMS,
        content: 'Hi {customerName}! Quick favor - if you have 2 minutes, we\'d love your feedback about your recent experience. {reviewLink} Thanks! - {businessName}',
        isDefault: false,
        isPrebuilt: true,
      },
      {
        name: 'Thank You Message',
        description: 'A thank you template for recent purchases',
        type: TemplateType.SMS,
        content: 'Hi {customerName}! Thank you for your recent purchase. Your feedback means everything to us! Please share your experience: {reviewLink} - {businessName}',
        isDefault: false,
        isPrebuilt: true,
      }
    ];

    console.log('Seeding prebuilt SMS templates...');
    
    for (const template of smsTemplates) {
      // Check if template already exists
      const existingTemplate = await prisma.template.findFirst({
        where: {
          name: template.name,
          isPrebuilt: true
        }
      });

      if (!existingTemplate) {
        await prisma.template.create({
          data: template
        });
        console.log(`Created prebuilt template: ${template.name}`);
      } else {
        console.log(`Template already exists: ${template.name}`);
      }
    }
    
    console.log('Successfully seeded prebuilt SMS templates!');
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
