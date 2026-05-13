-- SaaS account tenancy foundation.
-- Adds customer accounts, plan/subscription records, account memberships,
-- account-level module entitlements, and invite tokens on top of the
-- existing organization-scoped multi-tenant phase.

CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE "AccountRole" AS ENUM ('ACCOUNT_OWNER', 'ACCOUNT_ADMIN');
CREATE TYPE "AccountStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "AccountMembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "InviteScopeType" AS ENUM ('ACCOUNT', 'ORGANIZATION');
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "AccountStatus" NOT NULL DEFAULT 'TRIAL',
  "ownerUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "priceMonthly" DECIMAL(12,2),
  "priceYearly" DECIMAL(12,2),
  "priceDisplay" TEXT,
  "maxOrganizations" INTEGER,
  "maxEmployees" INTEGER,
  "allowedModules" JSONB,
  "features" JSONB,
  "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "startedAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountMembership" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "AccountRole" NOT NULL,
  "status" "AccountMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "invitedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountModule" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "planId" TEXT,
  "moduleId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invite" (
  "id" TEXT NOT NULL,
  "scopeType" "InviteScopeType" NOT NULL,
  "accountId" TEXT,
  "organizationId" TEXT,
  "email" TEXT NOT NULL,
  "emailNormalized" TEXT NOT NULL,
  "name" TEXT,
  "accountRole" "AccountRole",
  "organizationRole" "OrganizationRole",
  "branchId" TEXT,
  "departmentId" TEXT,
  "teamLeadId" TEXT,
  "managerId" TEXT,
  "reviewerId" TEXT,
  "tokenHash" TEXT NOT NULL,
  "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "invitedById" TEXT,
  "acceptedUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "emailNormalized" TEXT;
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

UPDATE "User"
SET "emailNormalized" = lower(trim("email")),
    "status" = CASE
      WHEN "active" = true THEN 'ACTIVE'::"UserStatus"
      ELSE 'SUSPENDED'::"UserStatus"
    END;

ALTER TABLE "User" ALTER COLUMN "emailNormalized" SET NOT NULL;

ALTER TABLE "Organization" ADD COLUMN "accountId" TEXT;

INSERT INTO "Account" ("id", "slug", "name", "status", "createdAt", "updatedAt")
VALUES ('default-account', 'adarsh', 'Adarsh', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "Organization"
SET "accountId" = 'default-account'
WHERE "id" = 'default-org';

UPDATE "Account"
SET "ownerUserId" = (
  SELECT "id" FROM "User" WHERE lower("email") = 'hr@adarshshipping.in' LIMIT 1
)
WHERE "id" = 'default-account';

ALTER TABLE "Organization" ALTER COLUMN "accountId" SET NOT NULL;

INSERT INTO "Plan" ("id", "key", "name", "priceDisplay", "maxOrganizations", "maxEmployees", "allowedModules", "features", "status", "createdAt", "updatedAt")
VALUES
  (
    'plan-basic',
    'basic',
    'Basic',
    'Placeholder',
    1,
    50,
    '["appraisal-management"]'::jsonb,
    '["Appraisal Management"]'::jsonb,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'plan-professional',
    'professional',
    'Professional',
    'Placeholder',
    3,
    300,
    '["appraisal-management","kpi-management"]'::jsonb,
    '["Appraisal Management","KPI Management"]'::jsonb,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'plan-enterprise',
    'enterprise',
    'Enterprise',
    'Placeholder',
    NULL,
    NULL,
    '["appraisal-management","kpi-management","hrms-attendance-management","crm"]'::jsonb,
    '["All modules"]'::jsonb,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

INSERT INTO "Subscription" ("id", "accountId", "planId", "status", "startedAt", "createdAt", "updatedAt")
VALUES (
  'subscription-default-account',
  'default-account',
  'plan-professional',
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "AccountMembership" ("id", "accountId", "userId", "role", "status", "createdAt", "updatedAt")
SELECT
  'acct_owner_default',
  'default-account',
  u."id",
  'ACCOUNT_OWNER'::"AccountRole",
  CASE
    WHEN u."status" = 'ACTIVE' THEN 'ACTIVE'::"AccountMembershipStatus"
    ELSE 'SUSPENDED'::"AccountMembershipStatus"
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE lower(u."email") = 'hr@adarshshipping.in'
ON CONFLICT DO NOTHING;

INSERT INTO "AccountMembership" ("id", "accountId", "userId", "role", "status", "createdAt", "updatedAt")
SELECT
  'acct_admin_default_platform',
  'default-account',
  u."id",
  'ACCOUNT_ADMIN'::"AccountRole",
  'ACTIVE'::"AccountMembershipStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE lower(u."email") = 'hariprasad.official.137@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO "AccountModule" ("id", "accountId", "planId", "moduleId", "enabled", "createdAt", "updatedAt")
SELECT
  'acct_module_' || m."id",
  'default-account',
  'plan-professional',
  m."id",
  CASE WHEN m."key" = 'appraisal-management' THEN true ELSE false END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Module" m
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "Account_slug_key" ON "Account"("slug");
CREATE INDEX "Account_status_createdAt_idx" ON "Account"("status", "createdAt");
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");
CREATE INDEX "Subscription_accountId_status_idx" ON "Subscription"("accountId", "status");
CREATE INDEX "Subscription_planId_status_idx" ON "Subscription"("planId", "status");
CREATE UNIQUE INDEX "AccountMembership_accountId_userId_key" ON "AccountMembership"("accountId", "userId");
CREATE INDEX "AccountMembership_userId_status_idx" ON "AccountMembership"("userId", "status");
CREATE INDEX "AccountMembership_accountId_role_status_idx" ON "AccountMembership"("accountId", "role", "status");
CREATE UNIQUE INDEX "AccountModule_accountId_moduleId_key" ON "AccountModule"("accountId", "moduleId");
CREATE INDEX "AccountModule_accountId_enabled_idx" ON "AccountModule"("accountId", "enabled");
CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite"("tokenHash");
CREATE INDEX "Invite_emailNormalized_status_idx" ON "Invite"("emailNormalized", "status");
CREATE INDEX "Invite_accountId_status_idx" ON "Invite"("accountId", "status");
CREATE INDEX "Invite_organizationId_status_idx" ON "Invite"("organizationId", "status");
CREATE INDEX "Invite_scopeType_expiresAt_idx" ON "Invite"("scopeType", "expiresAt");
CREATE UNIQUE INDEX "User_emailNormalized_key" ON "User"("emailNormalized");
CREATE INDEX "User_status_active_idx" ON "User"("status", "active");
CREATE INDEX "Organization_accountId_status_idx" ON "Organization"("accountId", "status");

ALTER TABLE "Account" ADD CONSTRAINT "Account_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountMembership" ADD CONSTRAINT "AccountMembership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountMembership" ADD CONSTRAINT "AccountMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountMembership" ADD CONSTRAINT "AccountMembership_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountModule" ADD CONSTRAINT "AccountModule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountModule" ADD CONSTRAINT "AccountModule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountModule" ADD CONSTRAINT "AccountModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
