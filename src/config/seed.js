/* eslint-disable no-undef */
import { PrismaClient } from '@prisma/client';

// Sirf empty constructor use karein
const prisma = new PrismaClient();

async function main() {
  console.log("Checking database connection...");
  
  // Test query: Sirf count check karein
  const count = await prisma.category.count();
  console.log(`Current category count: ${count}`);

  console.log("Seed finished!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });