-- Phase 1 SaaS tenancy foundation.
-- Existing records are backfilled into the default Adarsh tenant so legacy routes keep working.

CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_SUPER_ADMIN');
CREATE TYPE "OrganizationRole" AS ENUM (
  'ORG_OWNER',
  'ORG_ADMIN',
  'MANAGEMENT',
  'HR',
  'MANAGER',
  'TEAM_LEAD',
  'EMPLOYEE',
  'PARTNER_OR_DIRECTOR',
  'APPRAISAL_ADMIN'
);
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED');
CREATE TYPE "OrganizationUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');
CREATE TYPE "OrganizationAccessStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "legalName" TEXT,
  "industry" TEXT,
  "logoUrl" TEXT,
  "primaryColor" TEXT,
  "address" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING',
  "explicitlyAllowsPlatformDataAccess" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Branch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "country" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Department" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Division" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "departmentId" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Designation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "departmentId" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "level" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Designation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationUser" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "branchId" TEXT,
  "departmentId" TEXT,
  "divisionId" TEXT,
  "designationId" TEXT,
  "status" "OrganizationUserStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "invitedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserRoleAssignment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "membershipId" TEXT,
  "role" "OrganizationRole" NOT NULL,
  "branchId" TEXT,
  "departmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportingHierarchy" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "teamLeadId" TEXT,
  "managerId" TEXT,
  "managementId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportingHierarchy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Module" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationModule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "enabledAt" TIMESTAMP(3),
  "enabledById" TEXT,
  "disabledAt" TIMESTAMP(3),
  "disabledById" TEXT,
  "settings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationAccess" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "status" "OrganizationAccessStatus" NOT NULL DEFAULT 'TRIAL',
  "planName" TEXT,
  "seatsLimit" INTEGER,
  "startsAt" TIMESTAMP(3),
  "renewsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "suspendedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationSettings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "locale" TEXT NOT NULL DEFAULT 'en-IN',
  "dateFormat" TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
  "appraisalSettings" JSONB,
  "branding" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Organization" ("id", "slug", "name", "legalName", "industry", "logoUrl", "primaryColor", "status", "updatedAt")
VALUES ('default-org', 'adarsh-shipping-and-services', 'Adarsh Shipping and Services', 'Adarsh Shipping and Services', 'Shipping and logistics', '/api/logo?v=2', '#0e8a95', 'ACTIVE', CURRENT_TIMESTAMP);

INSERT INTO "Module" ("id", "key", "name", "description", "updatedAt")
VALUES ('module-appraisal-management', 'appraisal-management', 'Appraisal Management', 'Self-assessments, reviewer ratings, management decisions, MOM, arrears, KPI, notifications, support tickets, and audit logs.', CURRENT_TIMESTAMP);

INSERT INTO "OrganizationModule" ("id", "organizationId", "moduleId", "enabled", "enabledAt", "updatedAt")
VALUES ('default-org-appraisal-module', 'default-org', 'module-appraisal-management', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "OrganizationAccess" ("id", "organizationId", "status", "planName", "startsAt", "updatedAt")
VALUES ('default-org-access', 'default-org', 'ACTIVE', 'Legacy default organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "OrganizationSettings" ("id", "organizationId", "branding", "updatedAt")
VALUES ('default-org-settings', 'default-org', '{"productName":"Performance Management Platform"}'::jsonb, CURRENT_TIMESTAMP);

ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole";
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "User" ADD COLUMN "activeOrganizationId" TEXT;
ALTER TABLE "User" ADD COLUMN "branchId" TEXT;
ALTER TABLE "User" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "User" ADD COLUMN "divisionId" TEXT;
ALTER TABLE "User" ADD COLUMN "designationId" TEXT;
ALTER TABLE "User" ADD COLUMN "teamLeadId" TEXT;

UPDATE "User" SET "platformRole" = 'PLATFORM_SUPER_ADMIN' WHERE "role" = 'ADMIN';

ALTER TABLE "KpiDepartment" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "KpiTemplate" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "KpiTemplateItem" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "KpiReview" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "KpiReviewItem" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "EmployeeSalary" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "SalaryRevision" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "AppraisalCycle" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "AppraisalCycle" ADD COLUMN "branchId" TEXT;
ALTER TABLE "AppraisalCycle" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "AppraisalCycle" ADD COLUMN "managerId" TEXT;
ALTER TABLE "AppraisalCycle" ADD COLUMN "teamLeadId" TEXT;
ALTER TABLE "AppraisalCycle" ADD COLUMN "reportingToId" TEXT;
ALTER TABLE "SelfAssessment" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "CycleAssignment" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "Rating" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "DateVote" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "MOM" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "AppraisalDecision" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "IncrementSlab" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "ExtensionRequest" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "Notification" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "LoginChallenge" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "PasswordResetToken" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "PasskeyResetRequest" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "MessageRetriggerLog" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "AuditLog" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "SecurityEvent" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "UserSession" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "SystemSetting" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "CriteriaOverride" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "Ticket" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "TicketComment" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "Arrear" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "MeetingReschedule" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "RatingDisagreement" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "RatingReview" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "KpiCriterion" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "KpiTask" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "KpiTaskEvent" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "WorkingCalendar" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "OtSettings" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "Holiday" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "AttendanceLog" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "EmployeeOt" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "EmployeeLop" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default-org';

INSERT INTO "Branch" ("id", "organizationId", "name", "city", "active", "updatedAt")
SELECT 'branch_' || substr(md5(COALESCE("location", 'Head Office') || random()::text), 1, 24), 'default-org', COALESCE(NULLIF(trim("location"), ''), 'Head Office'), COALESCE(NULLIF(trim("location"), ''), 'Head Office'), true, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "location" FROM "User") locations
ON CONFLICT DO NOTHING;

INSERT INTO "Department" ("id", "organizationId", "name", "active", "updatedAt")
SELECT 'dept_' || substr(md5(COALESCE("department", 'General') || random()::text), 1, 24), 'default-org', COALESCE(NULLIF(trim("department"), ''), 'General'), true, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "department" FROM "User") departments
ON CONFLICT DO NOTHING;

INSERT INTO "Designation" ("id", "organizationId", "name", "active", "updatedAt")
SELECT 'desig_' || substr(md5(COALESCE("designation", 'Employee') || random()::text), 1, 24), 'default-org', COALESCE(NULLIF(trim("designation"), ''), 'Employee'), true, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "designation" FROM "User") designations
ON CONFLICT DO NOTHING;

UPDATE "User" u
SET "branchId" = b."id"
FROM "Branch" b
WHERE b."organizationId" = 'default-org'
  AND b."name" = COALESCE(NULLIF(trim(u."location"), ''), 'Head Office');

UPDATE "User" u
SET "departmentId" = d."id"
FROM "Department" d
WHERE d."organizationId" = 'default-org'
  AND d."name" = COALESCE(NULLIF(trim(u."department"), ''), 'General');

UPDATE "User" u
SET "designationId" = d."id"
FROM "Designation" d
WHERE d."organizationId" = 'default-org'
  AND d."name" = COALESCE(NULLIF(trim(u."designation"), ''), 'Employee');

INSERT INTO "OrganizationUser" ("id", "organizationId", "userId", "branchId", "departmentId", "designationId", "status", "updatedAt")
SELECT 'mbr_' || substr(md5(u."id" || random()::text), 1, 24), 'default-org', u."id", u."branchId", u."departmentId", u."designationId",
  CASE WHEN u."active" THEN 'ACTIVE'::"OrganizationUserStatus" ELSE 'SUSPENDED'::"OrganizationUserStatus" END,
  CURRENT_TIMESTAMP
FROM "User" u
ON CONFLICT DO NOTHING;

INSERT INTO "UserRoleAssignment" ("id", "organizationId", "userId", "membershipId", "role", "branchId", "departmentId")
SELECT 'role_' || substr(md5(u."id" || u."role"::text || random()::text), 1, 24),
  'default-org',
  u."id",
  ou."id",
  CASE u."role"
    WHEN 'ADMIN' THEN 'ORG_ADMIN'::"OrganizationRole"
    WHEN 'MANAGEMENT' THEN 'MANAGEMENT'::"OrganizationRole"
    WHEN 'MANAGER' THEN 'MANAGER'::"OrganizationRole"
    WHEN 'HR' THEN 'HR'::"OrganizationRole"
    WHEN 'TL' THEN 'TEAM_LEAD'::"OrganizationRole"
    WHEN 'PARTNER' THEN 'PARTNER_OR_DIRECTOR'::"OrganizationRole"
    ELSE 'EMPLOYEE'::"OrganizationRole"
  END,
  u."branchId",
  u."departmentId"
FROM "User" u
JOIN "OrganizationUser" ou ON ou."organizationId" = 'default-org' AND ou."userId" = u."id"
ON CONFLICT DO NOTHING;

INSERT INTO "UserRoleAssignment" ("id", "organizationId", "userId", "membershipId", "role", "branchId", "departmentId")
SELECT 'role_secondary_' || substr(md5(u."id" || u."secondaryRole"::text || random()::text), 1, 18),
  'default-org',
  u."id",
  ou."id",
  CASE u."secondaryRole"
    WHEN 'ADMIN' THEN 'ORG_ADMIN'::"OrganizationRole"
    WHEN 'MANAGEMENT' THEN 'MANAGEMENT'::"OrganizationRole"
    WHEN 'MANAGER' THEN 'MANAGER'::"OrganizationRole"
    WHEN 'HR' THEN 'HR'::"OrganizationRole"
    WHEN 'TL' THEN 'TEAM_LEAD'::"OrganizationRole"
    WHEN 'PARTNER' THEN 'PARTNER_OR_DIRECTOR'::"OrganizationRole"
    ELSE 'EMPLOYEE'::"OrganizationRole"
  END,
  u."branchId",
  u."departmentId"
FROM "User" u
JOIN "OrganizationUser" ou ON ou."organizationId" = 'default-org' AND ou."userId" = u."id"
WHERE u."secondaryRole" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "ReportingHierarchy" ("id", "organizationId", "employeeId", "teamLeadId", "managerId", "managementId", "updatedAt")
SELECT 'hier_' || substr(md5(u."id" || random()::text), 1, 24),
  'default-org',
  u."id",
  CASE WHEN tl."role" = 'TL' THEN tl."id" ELSE NULL END,
  CASE WHEN mgr."role" = 'MANAGER' THEN mgr."id" ELSE NULL END,
  CASE WHEN mgmt."role" = 'MANAGEMENT' OR mgmt."role" = 'PARTNER' THEN mgmt."id" ELSE NULL END,
  CURRENT_TIMESTAMP
FROM "User" u
LEFT JOIN "User" tl ON tl."id" = u."reportingManagerId" AND tl."role" = 'TL'
LEFT JOIN "User" mgr ON mgr."id" = u."reportingManagerId" AND mgr."role" = 'MANAGER'
LEFT JOIN "User" mgmt ON mgmt."id" = u."reportingManagerId" AND mgmt."role" IN ('MANAGEMENT', 'PARTNER')
WHERE u."reportingManagerId" IS NOT NULL;

UPDATE "AppraisalCycle" c
SET "branchId" = u."branchId",
    "departmentId" = u."departmentId",
    "managerId" = CASE WHEN rm."role" = 'MANAGER' THEN rm."id" ELSE NULL END,
    "teamLeadId" = CASE WHEN rm."role" = 'TL' THEN rm."id" ELSE NULL END,
    "reportingToId" = u."reportingManagerId"
FROM "User" u
LEFT JOIN "User" rm ON rm."id" = u."reportingManagerId"
WHERE c."userId" = u."id";

DROP INDEX IF EXISTS "KpiDepartment_parentId_name_key";
DROP INDEX IF EXISTS "KpiReview_userId_month_key";
DROP INDEX IF EXISTS "CriteriaOverride_categoryName_key";
DROP INDEX IF EXISTS "Holiday_holidayDate_holidayType_key";
DROP INDEX IF EXISTS "AttendanceLog_employeeId_attendanceDate_key";
DROP INDEX IF EXISTS "EmployeeLop_employeeId_payrollMonth_key";

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_status_createdAt_idx" ON "Organization"("status", "createdAt");
CREATE UNIQUE INDEX "Branch_organizationId_name_key" ON "Branch"("organizationId", "name");
CREATE UNIQUE INDEX "Branch_organizationId_code_key" ON "Branch"("organizationId", "code");
CREATE INDEX "Branch_organizationId_active_idx" ON "Branch"("organizationId", "active");
CREATE UNIQUE INDEX "Department_organizationId_branchId_name_key" ON "Department"("organizationId", "branchId", "name");
CREATE UNIQUE INDEX "Department_organizationId_code_key" ON "Department"("organizationId", "code");
CREATE INDEX "Department_organizationId_active_idx" ON "Department"("organizationId", "active");
CREATE INDEX "Department_branchId_idx" ON "Department"("branchId");
CREATE UNIQUE INDEX "Division_organizationId_departmentId_name_key" ON "Division"("organizationId", "departmentId", "name");
CREATE UNIQUE INDEX "Division_organizationId_code_key" ON "Division"("organizationId", "code");
CREATE INDEX "Division_organizationId_active_idx" ON "Division"("organizationId", "active");
CREATE INDEX "Division_departmentId_idx" ON "Division"("departmentId");
CREATE UNIQUE INDEX "Designation_organizationId_name_key" ON "Designation"("organizationId", "name");
CREATE UNIQUE INDEX "Designation_organizationId_code_key" ON "Designation"("organizationId", "code");
CREATE INDEX "Designation_organizationId_active_idx" ON "Designation"("organizationId", "active");
CREATE UNIQUE INDEX "OrganizationUser_organizationId_userId_key" ON "OrganizationUser"("organizationId", "userId");
CREATE INDEX "OrganizationUser_userId_status_idx" ON "OrganizationUser"("userId", "status");
CREATE INDEX "OrganizationUser_organizationId_status_idx" ON "OrganizationUser"("organizationId", "status");
CREATE INDEX "OrganizationUser_branchId_idx" ON "OrganizationUser"("branchId");
CREATE INDEX "OrganizationUser_departmentId_idx" ON "OrganizationUser"("departmentId");
CREATE UNIQUE INDEX "UserRoleAssignment_organizationId_userId_role_branchId_departmentId_key" ON "UserRoleAssignment"("organizationId", "userId", "role", "branchId", "departmentId");
CREATE INDEX "UserRoleAssignment_organizationId_role_idx" ON "UserRoleAssignment"("organizationId", "role");
CREATE INDEX "UserRoleAssignment_userId_role_idx" ON "UserRoleAssignment"("userId", "role");
CREATE INDEX "UserRoleAssignment_membershipId_idx" ON "UserRoleAssignment"("membershipId");
CREATE INDEX "ReportingHierarchy_organizationId_active_idx" ON "ReportingHierarchy"("organizationId", "active");
CREATE INDEX "ReportingHierarchy_employeeId_active_idx" ON "ReportingHierarchy"("employeeId", "active");
CREATE INDEX "ReportingHierarchy_teamLeadId_idx" ON "ReportingHierarchy"("teamLeadId");
CREATE INDEX "ReportingHierarchy_managerId_idx" ON "ReportingHierarchy"("managerId");
CREATE INDEX "ReportingHierarchy_managementId_idx" ON "ReportingHierarchy"("managementId");
CREATE UNIQUE INDEX "Module_key_key" ON "Module"("key");
CREATE UNIQUE INDEX "OrganizationModule_organizationId_moduleId_key" ON "OrganizationModule"("organizationId", "moduleId");
CREATE INDEX "OrganizationModule_organizationId_enabled_idx" ON "OrganizationModule"("organizationId", "enabled");
CREATE UNIQUE INDEX "OrganizationAccess_organizationId_key" ON "OrganizationAccess"("organizationId");
CREATE INDEX "OrganizationAccess_status_expiresAt_idx" ON "OrganizationAccess"("status", "expiresAt");
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

CREATE INDEX "User_organizationId_role_active_idx" ON "User"("organizationId", "role", "active");
CREATE INDEX "User_branchId_idx" ON "User"("branchId");
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");
CREATE INDEX "User_teamLeadId_idx" ON "User"("teamLeadId");
CREATE UNIQUE INDEX "KpiDepartment_organizationId_parentId_name_key" ON "KpiDepartment"("organizationId", "parentId", "name");
CREATE INDEX "KpiDepartment_organizationId_active_idx" ON "KpiDepartment"("organizationId", "active");
CREATE INDEX "KpiTemplate_organizationId_active_idx" ON "KpiTemplate"("organizationId", "active");
CREATE INDEX "KpiTemplateItem_organizationId_idx" ON "KpiTemplateItem"("organizationId");
CREATE UNIQUE INDEX "KpiReview_organizationId_userId_month_key" ON "KpiReview"("organizationId", "userId", "month");
CREATE INDEX "KpiReview_organizationId_month_status_idx" ON "KpiReview"("organizationId", "month", "status");
CREATE INDEX "KpiReviewItem_organizationId_idx" ON "KpiReviewItem"("organizationId");
CREATE INDEX "EmployeeSalary_organizationId_idx" ON "EmployeeSalary"("organizationId");
CREATE INDEX "SalaryRevision_organizationId_effectiveFrom_idx" ON "SalaryRevision"("organizationId", "effectiveFrom");
CREATE INDEX "AppraisalCycle_organizationId_status_startDate_idx" ON "AppraisalCycle"("organizationId", "status", "startDate");
CREATE INDEX "AppraisalCycle_organizationId_branchId_departmentId_idx" ON "AppraisalCycle"("organizationId", "branchId", "departmentId");
CREATE INDEX "SelfAssessment_organizationId_idx" ON "SelfAssessment"("organizationId");
CREATE INDEX "CycleAssignment_organizationId_idx" ON "CycleAssignment"("organizationId");
CREATE INDEX "Rating_organizationId_idx" ON "Rating"("organizationId");
CREATE INDEX "DateVote_organizationId_idx" ON "DateVote"("organizationId");
CREATE INDEX "MOM_organizationId_idx" ON "MOM"("organizationId");
CREATE INDEX "AppraisalDecision_organizationId_idx" ON "AppraisalDecision"("organizationId");
CREATE INDEX "IncrementSlab_organizationId_minRating_maxRating_idx" ON "IncrementSlab"("organizationId", "minRating", "maxRating");
CREATE INDEX "ExtensionRequest_organizationId_status_idx" ON "ExtensionRequest"("organizationId", "status");
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");
CREATE INDEX "LoginChallenge_organizationId_expiresAt_idx" ON "LoginChallenge"("organizationId", "expiresAt");
CREATE INDEX "PasswordResetToken_organizationId_expiresAt_idx" ON "PasswordResetToken"("organizationId", "expiresAt");
CREATE INDEX "PasskeyResetRequest_organizationId_status_idx" ON "PasskeyResetRequest"("organizationId", "status");
CREATE INDEX "MessageRetriggerLog_organizationId_createdAt_idx" ON "MessageRetriggerLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "SecurityEvent_organizationId_createdAt_idx" ON "SecurityEvent"("organizationId", "createdAt");
CREATE INDEX "UserSession_organizationId_status_idx" ON "UserSession"("organizationId", "status");
CREATE INDEX "SystemSetting_organizationId_idx" ON "SystemSetting"("organizationId");
CREATE UNIQUE INDEX "CriteriaOverride_organizationId_categoryName_key" ON "CriteriaOverride"("organizationId", "categoryName");
CREATE INDEX "CriteriaOverride_organizationId_idx" ON "CriteriaOverride"("organizationId");
CREATE INDEX "Ticket_organizationId_status_createdAt_idx" ON "Ticket"("organizationId", "status", "createdAt");
CREATE INDEX "TicketComment_organizationId_createdAt_idx" ON "TicketComment"("organizationId", "createdAt");
CREATE INDEX "Arrear_organizationId_status_idx" ON "Arrear"("organizationId", "status");
CREATE INDEX "MeetingReschedule_organizationId_createdAt_idx" ON "MeetingReschedule"("organizationId", "createdAt");
CREATE INDEX "RatingDisagreement_organizationId_idx" ON "RatingDisagreement"("organizationId");
CREATE INDEX "RatingReview_organizationId_idx" ON "RatingReview"("organizationId");
CREATE INDEX "KpiCriterion_organizationId_status_approvalStatus_idx" ON "KpiCriterion"("organizationId", "status", "approvalStatus");
CREATE INDEX "KpiTask_organizationId_status_idx" ON "KpiTask"("organizationId", "status");
CREATE INDEX "KpiTaskEvent_organizationId_timestamp_idx" ON "KpiTaskEvent"("organizationId", "timestamp");
CREATE INDEX "WorkingCalendar_organizationId_idx" ON "WorkingCalendar"("organizationId");
CREATE INDEX "OtSettings_organizationId_idx" ON "OtSettings"("organizationId");
CREATE UNIQUE INDEX "Holiday_organizationId_holidayDate_holidayType_key" ON "Holiday"("organizationId", "holidayDate", "holidayType");
CREATE INDEX "Holiday_organizationId_holidayDate_idx" ON "Holiday"("organizationId", "holidayDate");
CREATE UNIQUE INDEX "AttendanceLog_organizationId_employeeId_attendanceDate_key" ON "AttendanceLog"("organizationId", "employeeId", "attendanceDate");
CREATE INDEX "AttendanceLog_organizationId_attendanceDate_idx" ON "AttendanceLog"("organizationId", "attendanceDate");
CREATE INDEX "EmployeeOt_organizationId_attendanceDate_idx" ON "EmployeeOt"("organizationId", "attendanceDate");
CREATE UNIQUE INDEX "EmployeeLop_organizationId_employeeId_payrollMonth_key" ON "EmployeeLop"("organizationId", "employeeId", "payrollMonth");
CREATE INDEX "EmployeeLop_organizationId_payrollMonth_idx" ON "EmployeeLop"("organizationId", "payrollMonth");

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Division" ADD CONSTRAINT "Division_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Division" ADD CONSTRAINT "Division_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Designation" ADD CONSTRAINT "Designation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Designation" ADD CONSTRAINT "Designation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportingHierarchy" ADD CONSTRAINT "ReportingHierarchy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportingHierarchy" ADD CONSTRAINT "ReportingHierarchy_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportingHierarchy" ADD CONSTRAINT "ReportingHierarchy_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportingHierarchy" ADD CONSTRAINT "ReportingHierarchy_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportingHierarchy" ADD CONSTRAINT "ReportingHierarchy_managementId_fkey" FOREIGN KEY ("managementId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationModule" ADD CONSTRAINT "OrganizationModule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationModule" ADD CONSTRAINT "OrganizationModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationAccess" ADD CONSTRAINT "OrganizationAccess_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
