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
