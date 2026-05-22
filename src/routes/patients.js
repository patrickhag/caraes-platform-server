import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const patientsRouter = Router();

// GET /api/patients
patientsRouter.get(
  "/",
  requireAuth,
  requireRole("COORDINATOR", "ADMIN", "HOSPITAL_ADMIN"),
  async (request, response, next) => {
    try {
      const patients = await prisma.patient.findMany({
        orderBy: { createdAt: "desc" },
      });
      response.json(patients);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/patients/:id
patientsRouter.get(
  "/:id",
  requireAuth,
  requireRole("COORDINATOR", "ADMIN", "HOSPITAL_ADMIN"),
  async (request, response, next) => {
    try {
      const { id } = request.params;
      const patient = await prisma.patient.findUnique({ where: { id } });

      if (!patient) {
        return response.status(404).json({ message: "Patient not found." });
      }

      response.json(patient);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/patients
patientsRouter.post(
  "/",
  requireAuth,
  requireRole("COORDINATOR"),
  async (request, response, next) => {
    try {
      const {
        firstName,
        lastName,
        gender,
        dateOfBirth,
        nationalId,
        phoneNumber,
        email,
        emergencyContactName,
        emergencyContactPhone,
        province,
        district,
        sector,
        cell,
        village,
        disabilityType,
        conditionNotes,
        bloodType,
        insuranceProvider,
        insuranceNumber,
        allergies,
        medications,
        mobilityStatus,
        requiresSpecialist,
        profileImage,
      } = request.body;

      console.log("body", request.body)

      if (!firstName || !lastName || !gender || !phoneNumber || !email || !province || !district || !sector || !cell || !village) {
        return response.status(400).json({
          message: "firstName, lastName, gender, phoneNumber, email, province, district, sector, cell, and village are required.",
        });
      }

      // Parse dateOfBirth to Date if provided
      let dob = null;
      if (dateOfBirth) {
        dob = new Date(dateOfBirth);
        if (isNaN(dob.getTime())) {
          return response.status(400).json({ message: "Invalid dateOfBirth format." });
        }
      }

      // Check if patient with same email already exists
      const existingPatient = await prisma.patient.findUnique({
        where: { email: String(email).trim() },
      });
      if (existingPatient) {
        return response.status(400).json({ message: "A patient with this email already exists." });
      }

      // Check if patient with same nationalId already exists (if provided)
      if (nationalId) {
        const existingNationalId = await prisma.patient.findUnique({
          where: { nationalId: String(nationalId).trim() },
        });
        if (existingNationalId) {
          return response.status(400).json({ message: "A patient with this nationalId already exists." });
        }
      }

      const patient = await prisma.patient.create({
        data: {
          firstName: String(firstName).trim(),
          lastName: String(lastName).trim(),
          gender,
          dateOfBirth: dob,
          nationalId: nationalId ? String(nationalId).trim() : null,
          phoneNumber: String(phoneNumber).trim(),
          email: String(email).trim(),
          emergencyContactName: emergencyContactName ? String(emergencyContactName).trim() : null,
          emergencyContactPhone: emergencyContactPhone ? String(emergencyContactPhone).trim() : null,
          province: String(province).trim(),
          district: String(district).trim(),
          sector: String(sector).trim(),
          cell: String(cell).trim(),
          village: String(village).trim(),
          disabilityType: disabilityType || null,
          conditionNotes: conditionNotes ? String(conditionNotes).trim() : null,
          bloodType: bloodType || null,
          insuranceProvider: insuranceProvider ? String(insuranceProvider).trim() : null,
          insuranceNumber: insuranceNumber ? String(insuranceNumber).trim() : null,
          allergies: allergies ? String(allergies).trim() : null,
          medications: medications ? String(medications).trim() : null,
          mobilityStatus: mobilityStatus ? String(mobilityStatus).trim() : null,
          requiresSpecialist: typeof requiresSpecialist === "boolean" ? requiresSpecialist : false,
          profileImage: profileImage ? String(profileImage).trim() : null,
        },
      });

      response.status(201).json(patient);
    } catch (error) {
      next(error);
    }
  }
);
