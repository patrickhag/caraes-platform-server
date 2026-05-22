import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";
try {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      isVerified: true
    }
  });
  console.log("DB USERS:", JSON.stringify(users, null, 2));
} catch (e) {
  console.error(e);
} finally {
  await prisma.$disconnect();
}
