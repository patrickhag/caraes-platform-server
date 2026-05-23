import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const hospitalsRouter = Router();

const hospitalTypes = [
  "CLINIC",
  "HEALTH_CENTER",
  "DISTRICT_HOSPITAL",
  "REFERRAL_HOSPITAL",
  "SPECIALIZED_CENTER",
];

// GET ALL HOSPITALS
hospitalsRouter.get(
  "/",
  requireAuth,
  requireRole("ADMIN", "HOSPITAL_ADMIN"),
  async (request, response, next) => {
    try {
      const activeOnly =
        request.query.active === "true" || request.query.active === "1";

      const where = {
        ...(activeOnly ? { isActive: true } : {}),
        ...(request.user.role === "HOSPITAL_ADMIN"
          ? { id: request.user.hospitalId ?? undefined }
          : {}),
      };

      const hospitals = await prisma.hospital.findMany({
        where,
        orderBy: { name: "asc" },
      });

      response.json(hospitals);
    } catch (error) {
      next(error);
    }
  },
);

// GET A SINGLE HOSPITAL
hospitalsRouter.get(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "HOSPITAL_ADMIN"),
  async (request, response, next) => {
    try {
      const { id } = request.params;

      // HOSPITAL_ADMIN can only view their own hospital
      if (
        request.user.role === "HOSPITAL_ADMIN" &&
        request.user.hospitalId !== id
      ) {
        return response.status(403).json({ message: "Access denied." });
      }

      const hospital = await prisma.hospital.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              prefix: true,
              email: true,
              role: true,
              isVerified: true,
              createdAt: true,
            },
            orderBy: { firstName: "asc" },
          },
        },
      });

      if (!hospital) {
        return response.status(404).json({ message: "Hospital not found." });
      }

      response.json(hospital);
    } catch (error) {
      next(error);
    }
  },
);

// UPDATE HOSPITALS INFORMATION
hospitalsRouter.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (request, response, next) => {
    try {
      const { id } = request.params;
      const {
        name,
        type,
        phone,
        email,
        province,
        district,
        sector,
        cell,
        isActive,
      } = request.body;

      const existing = await prisma.hospital.findUnique({ where: { id } });
      if (!existing) {
        return response.status(404).json({ message: "Hospital not found." });
      }

      if (type && !hospitalTypes.includes(type)) {
        return response.status(400).json({ message: "Invalid hospital type." });
      }

      const hospital = await prisma.hospital.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: String(name).trim() }),
          ...(type !== undefined && { type }),
          ...(phone !== undefined && {
            phone: phone ? String(phone).trim() : null,
          }),
          ...(email !== undefined && {
            email: email ? String(email).trim() : null,
          }),
          ...(province !== undefined && { province: String(province).trim() }),
          ...(district !== undefined && { district: String(district).trim() }),
          ...(sector !== undefined && {
            sector: sector ? String(sector).trim() : null,
          }),
          ...(cell !== undefined && {
            cell: cell ? String(cell).trim() : null,
          }),
          ...(typeof isActive === "boolean" && { isActive }),
        },
      });

      response.json(hospital);
    } catch (error) {
      next(error);
    }
  },
);

// CREATE A HOSPITAL
hospitalsRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  async (request, response, next) => {
    try {
      const {
        name,
        type,
        phone,
        email,
        province,
        district,
        sector,
        cell,
        isActive,
      } = request.body;

      if (!name || !type || !province || !district) {
        return response.status(400).json({
          message: "name, type, province, and district are required.",
        });
      }

      if (!hospitalTypes.includes(type)) {
        return response.status(400).json({ message: "Invalid hospital type." });
      }

      const hospital = await prisma.hospital.create({
        data: {
          name: String(name).trim(),
          type,
          phone: phone ? String(phone).trim() : null,
          email: email ? String(email).trim() : null,
          province: String(province).trim(),
          district: String(district).trim(),
          sector: sector ? String(sector).trim() : null,
          cell: cell ? String(cell).trim() : null,
          isActive: typeof isActive === "boolean" ? isActive : true,
        },
      });

      response.status(201).json(hospital);
    } catch (error) {
      next(error);
    }
  },
);
