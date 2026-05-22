import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";

export const roles = ["ADMIN", "COORDINATOR", "HOSPITAL_ADMIN"];

export const dashboardRoutes = {
  ADMIN: "/admin/dashboard",
  COORDINATOR: "/coordinator/dashboard",
  HOSPITAL_ADMIN: "/hospital-admin/dashboard",
};

const jwtSecret = process.env.JWT_SECRET || "change-this-secret";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "1d";

export function createAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn },
  );
}

export function verifyAuthToken(token) {
  try {
    const decoded = jwt.verify(token, jwtSecret);

    return decoded.id && decoded.role ? decoded : null;
  } catch {
    return null;
  }
}

export function userSelect() {
  return {
    id: true,
    firstName: true,
    lastName: true,
    prefix: true,
    email: true,
    role: true,
    hospitalId: true,
    hospital: {
      select: {
        id: true,
        name: true,
      },
    },
    isVerified: true,
    createdAt: true,
    updatedAt: true,
  };
}

export const rolesRequiringHospital = ["COORDINATOR", "HOSPITAL_ADMIN"];

export async function createAdminUser(credentials = {}) {
  const admin = {
    firstName:
      credentials.firstName || process.env.ADMIN_FIRST_NAME || "System",
    lastName: credentials.lastName || process.env.ADMIN_LAST_NAME || "Admin",
    prefix: credentials.prefix || process.env.ADMIN_PREFIX || null,
    email: credentials.email || process.env.ADMIN_EMAIL || "admin@caraes.local",
    password:
      credentials.password || process.env.ADMIN_PASSWORD || "Admin@12345",
  };

  const hashedPassword = await bcrypt.hash(admin.password, 12);

  return prisma.user.upsert({
    where: { email: admin.email },
    update: {
      firstName: admin.firstName,
      lastName: admin.lastName,
      prefix: admin.prefix,
      password: hashedPassword,
      role: "ADMIN",
      isVerified: true,
    },
    create: {
      firstName: admin.firstName,
      lastName: admin.lastName,
      prefix: admin.prefix,
      email: admin.email,
      password: hashedPassword,
      role: "ADMIN",
      isVerified: true,
    },
    select: userSelect(),
  });
}
