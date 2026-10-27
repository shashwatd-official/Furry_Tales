const path = require('path');
// Load environment variables from root .env
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const bcrypt = require('bcrypt');
const prisma = require('../src/config/db');

async function seedOwner() {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;

  if (!email || !password) {
    console.error('Error: OWNER_EMAIL and OWNER_PASSWORD must be defined in .env');
    process.exit(1);
  }

  try {
    const existingOwner = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { role: 'owner' }
        ]
      }
    });

    if (existingOwner) {
      console.log(`Owner account already exists (${existingOwner.email}). Skipping duplicate creation.`);
      return;
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const owner = await prisma.user.create({
      data: {
        name: 'Platform Owner',
        email: email,
        password_hash: password_hash,
        role: 'owner',
      }
    });

    console.log(`Successfully seeded owner account: ${owner.email} (ID: ${owner.id})`);
  } catch (error) {
    console.error('Error seeding owner account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedOwner();
