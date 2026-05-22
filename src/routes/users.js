import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Router } from "express";
import { roles, rolesRequiringHospital, userSelect } from "../lib/auth.js";
import { sendAccountCreatedEmail } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const usersRouter = Router();

usersRouter.get("/confirm/:token", async (request, response, next) => {
  try {
    const { token } = request.params;

    // Find the token in the database
    const confirmation = await prisma.accountConfirmation.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!confirmation) {
      return response.status(404).send(`
        <html>
          <head>
            <title>Invalid Token</title>
            <style>
              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8f9fa; }
              .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
              h1 { color: #dc3545; font-size: 24px; margin-bottom: 10px; }
              p { color: #6c757d; font-size: 16px; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Verification Failed</h1>
              <p>The confirmation link is invalid or has already been used.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Check if it's expired
    if (new Date() > confirmation.expiresAt) {
      // Clean up the expired token
      await prisma.accountConfirmation.delete({
        where: { id: confirmation.id },
      });

      return response.status(400).send(`
        <html>
          <head>
            <title>Link Expired</title>
            <style>
              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8f9fa; }
              .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
              h1 { color: #ffc107; font-size: 24px; margin-bottom: 10px; }
              p { color: #6c757d; font-size: 16px; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Link Expired</h1>
              <p>This confirmation link has expired. Please contact an administrator to re-verify your account.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: confirmation.userId },
      data: { isVerified: true },
    });

    // Delete the confirmation token so it can't be reused
    await prisma.accountConfirmation.delete({ where: { id: confirmation.id } });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    return response.send(`
      <html>
        <head>
          <title>Account Verified</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8f9fa; }
            .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 450px; }
            h1 { color: #28a745; font-size: 26px; margin-bottom: 15px; }
            p { color: #6c757d; font-size: 16px; line-height: 1.5; margin-bottom: 25px; }
            a { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; transition: background 0.2s; }
            a:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Verification Successful!</h1>
            <p>Your CARAES IMS account has been successfully verified. You can now log in to the system.</p>
            <a href="${frontendUrl}/login?verified=true">Go to Login</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/", requireAuth, requireRole("ADMIN"), async (request, response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: userSelect(),
    });

    response.status(200).json(users);
  } catch (error) {
    response.status(500).json(error.message);
  }
});

usersRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "HOSPITAL_ADMIN"),
  async (request, response, next) => {
    try {
      const { firstName, lastName, prefix, email, password, role, hospitalId } =
        request.body;

      if (!firstName || !lastName || !email || !password || !role) {
        return response.status(400).json({
          message:
            "firstName, lastName, email, password, and role are required.",
        });
      }

      if (!roles.includes(role)) {
        return response.status(400).json({ message: "Invalid user role." });
      }

      let assignedHospitalId = hospitalId || null;

      if (request.user.role === "HOSPITAL_ADMIN") {
        if (!request.user.hospitalId) {
          return response.status(403).json({
            message: "Your account is not linked to a hospital.",
          });
        }

        assignedHospitalId = request.user.hospitalId;

        if (role === "ADMIN") {
          return response.status(403).json({
            message: "You cannot create admin users.",
          });
        }
      }

      if (rolesRequiringHospital.includes(role) && !assignedHospitalId) {
        return response.status(400).json({
          message: "A hospital is required for this role.",
        });
      }

      if (role === "ADMIN" && assignedHospitalId) {
        return response.status(400).json({
          message: "Admin users cannot be assigned to a hospital.",
        });
      }

      if (assignedHospitalId) {
        const hospital = await prisma.hospital.findUnique({
          where: { id: assignedHospitalId },
        });

        if (!hospital) {
          return response.status(400).json({ message: "Hospital not found." });
        }

        if (!hospital.isActive) {
          return response
            .status(400)
            .json({ message: "Hospital is not active." });
        }
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        return response
          .status(400)
          .json({ message: "User with this email already exists." });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            firstName,
            lastName,
            prefix,
            email,
            password: hashedPassword,
            role,
            hospitalId: assignedHospitalId,
            isVerified: false,
          },
          select: userSelect(),
        });

        await tx.accountConfirmation.create({
          data: {
            token,
            expiresAt,
            userId: u.id,
          },
        });

        return u;
      });

      let accountEmailSent = true;
      const appUrl =
        process.env.API_URL || process.env.APP_URL || "http://localhost:3000";
      const confirmUrl = `${appUrl}/api/users/confirm/${token}`;

      try {
        await sendAccountCreatedEmail(user, confirmUrl);
      } catch (emailError) {
        accountEmailSent = false;
        console.error(emailError);
      }

      response.status(201).json({ ...user, accountEmailSent });
    } catch (error) {
      next(error);
    }
  },
);
