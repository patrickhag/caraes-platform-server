ALTER TABLE "User" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" SET "isVerified" = true;
