-- CreateEnum
CREATE TYPE "HospitalType" AS ENUM ('CLINIC', 'HEALTH_CENTER', 'DISTRICT_HOSPITAL', 'REFERRAL_HOSPITAL', 'SPECIALIZED_CENTER');

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HospitalType" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "sector" TEXT,
    "cell" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);
