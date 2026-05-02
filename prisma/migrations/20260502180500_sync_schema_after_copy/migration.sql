-- CreateEnum
CREATE TYPE "SelfAssessmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REOPENED', 'LOCKED');

-- CreateEnum
CREATE TYPE "ArrearStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "RescheduleStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- DropIndex
DROP INDEX "MOM_cycleId_key";

-- AlterTable
ALTER TABLE "MOM" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'MANAGEMENT';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "acknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN "critical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "important" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "retriggeredFromId" TEXT,
ADD COLUMN "urgent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SelfAssessment" ADD COLUMN "lastModifiedAt" TIMESTAMP(3),
ADD COLUMN "status" "SelfAssessmentStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Arrear" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "arrearDays" INTEGER NOT NULL,
    "dailyRate" DECIMAL(12,2) NOT NULL,
    "arrearAmount" DECIMAL(12,2) NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "payoutMonth" TIMESTAMP(3),
    "status" "ArrearStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Arrear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingReschedule" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "originalDate" TIMESTAMP(3) NOT NULL,
    "newDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "rescheduledById" TEXT NOT NULL,
    "status" "RescheduleStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingReschedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_userId_status_idx" ON "UserSession"("userId", "status");

-- CreateIndex
CREATE INDEX "UserSession_status_lastSeenAt_idx" ON "UserSession"("status", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Arrear_cycleId_key" ON "Arrear"("cycleId");

-- CreateIndex
CREATE INDEX "Arrear_userId_status_idx" ON "Arrear"("userId", "status");

-- CreateIndex
CREATE INDEX "Arrear_cycleId_idx" ON "Arrear"("cycleId");

-- CreateIndex
CREATE INDEX "MeetingReschedule_cycleId_createdAt_idx" ON "MeetingReschedule"("cycleId", "createdAt");

-- CreateIndex
CREATE INDEX "MOM_cycleId_idx" ON "MOM"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "MOM_cycleId_role_key" ON "MOM"("cycleId", "role");

-- CreateIndex
CREATE INDEX "Notification_userId_critical_dismissed_idx" ON "Notification"("userId", "critical", "dismissed");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arrear" ADD CONSTRAINT "Arrear_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arrear" ADD CONSTRAINT "Arrear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arrear" ADD CONSTRAINT "Arrear_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingReschedule" ADD CONSTRAINT "MeetingReschedule_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingReschedule" ADD CONSTRAINT "MeetingReschedule_rescheduledById_fkey" FOREIGN KEY ("rescheduledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingReschedule" ADD CONSTRAINT "MeetingReschedule_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
