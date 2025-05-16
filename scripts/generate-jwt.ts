import * as jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import prisma from '../lib/prisma';
// Load environment variables
config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET not found in .env file');
  process.exit(1);
}

async function main() {
  
  try {
    // Get the first user in the database
    const user = await prisma.user.findFirst({
      include: {
        organization: true,
      },
    });
    
    if (!user) {
      console.error('No users found in the database. Run the seed script first.');
      process.exit(1);
    }

    // Create a token for the user
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET as jwt.Secret, {
      expiresIn: '1h',
    });

    console.log('TEST JWT TOKEN:');
    console.log('-------------------------------------------------------------');
    console.log(token);
    console.log('-------------------------------------------------------------');
    console.log('');
    console.log('Use this token in your API requests with the following header:');
    console.log('Authorization: Bearer <token>');
    console.log('');
    console.log('User details:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Organization ID: ${user.organization?.id || 'N/A'}`);

  } catch (error) {
    console.error('Error generating JWT token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error); 