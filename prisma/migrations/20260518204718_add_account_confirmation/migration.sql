-- CreateTable
CREATE TABLE "AccountConfirmation" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountConfirmation_token_key" ON "AccountConfirmation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "AccountConfirmation_userId_key" ON "AccountConfirmation"("userId");

-- AddForeignKey
ALTER TABLE "AccountConfirmation" ADD CONSTRAINT "AccountConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
