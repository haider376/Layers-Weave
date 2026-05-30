import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/seed";

// CLI runner — `npm run db:seed` / `tsx prisma/seed.ts`
const prisma = new PrismaClient();
seedDatabase(prisma)
  .then((r) => {
    console.log("✅ Seed complete.");
    console.log(`   Users: ${r.users} (password for all: "${r.defaultPassword}")`);
    console.log("   Sign in e.g. haider@layerswholesale.com / password");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
