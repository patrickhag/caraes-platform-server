import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Router } from "express";
import {
  createAuthToken,
  dashboardRoutes,
  roles,
  userSelect,
} from "../lib/auth.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

authRouter.get("/me", requireAuth, async (request, response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: userSelect(),
    });

    if (!user) {
      return response.status(404).json({ message: "User not found." });
    }

    response.json(user);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (request, response, next) => {
  try {
    const { email, password, role } = request.body;

    if (!email || !password || !role) {
      return response
        .status(400)
        .json({ message: "Email, password, and role are required." });
    }

    if (!roles.includes(role)) {
      return response.status(400).json({ message: "Invalid user role." });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.role !== role) {
      return response.status(401).json({ message: "Invalid credentials." });
    }

    if (!user.isVerified) {
      return response.status(403).json({
        message:
          "Your account has not been verified yet. Please contact an administrator.",
      });
    }

    if (!user.isActive) {
      return response.status(403).json({
        message:
          "Your account has been disabled. Please contact an administrator.",
      });
    }

    const passwordMatches =
      user.password === password ||
      (await bcrypt.compare(password, user.password));

    if (!passwordMatches) {
      return response.status(401).json({ message: "Invalid credentials." });
    }

    const publicUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: userSelect(),
    });

    response.json({
      token: createAuthToken(user),
      userRole: user.role,
      redirectTo: dashboardRoutes[user.role],
      hospitalId: publicUser.hospitalId,
      hospitalName: publicUser.hospital?.name ?? null,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/forgot-password", async (request, response, next) => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response
        .status(400)
        .json({ message: "Email and new password are required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond with a generic success message to prevent user enumeration
    if (!user) {
      return response.status(200).json({
        message: "If that email exists, we have sent a password reset link.",
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create password reset record
    await prisma.passwordReset.create({
      data: {
        token,
        password: hashedPassword,
        expiresAt,
        userId: user.id,
      },
    });

    const appUrl =
      process.env.API_URL || process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/api/auth/reset-password/confirm/${token}`;

    try {
      await sendPasswordResetEmail(user, resetUrl);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
    }

    response.status(200).json({
      message: "If that email exists, we have sent a password reset link.",
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get(
  "/reset-password/confirm/:token",
  async (request, response, next) => {
    try {
      const { token } = request.params;

      const reset = await prisma.passwordReset.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!reset) {
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
              <h1>Reset Failed</h1>
              <p>The password reset link is invalid or has already been used.</p>
            </div>
          </body>
        </html>
      `);
      }

      if (new Date() > reset.expiresAt) {
        await prisma.passwordReset.delete({ where: { id: reset.id } });
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
              <p>This password reset link has expired. Please request a new password reset.</p>
            </div>
          </body>
        </html>
      `);
      }

      // Update user's password with the new hashed password
      await prisma.$transaction([
        prisma.user.update({
          where: { id: reset.userId },
          data: { password: reset.password },
        }),
        prisma.passwordReset.delete({
          where: { id: reset.id },
        }),
      ]);

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

      return response.send(`
      <html>
        <head>
          <title>Password Reset Successful</title>
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
            <h1>Password Reset Successful!</h1>
            <p>Your password has been successfully reset. You can now log in to the system with your new password.</p>
            <a href="${frontendUrl}/">Go to Login</a>
          </div>
        </body>
      </html>
    `);
    } catch (error) {
      next(error);
    }
  },
);
