CREATE TYPE "KpiReviewStatus" AS ENUM ('DRAFT', 'FINALIZED');

CREATE TABLE "KpiDepartment" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KpiDepartment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiTemplate" (
  "id" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KpiTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiTemplateItem" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "weightage" DOUBLE PRECISION NOT NULL,
  "measurement" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KpiTemplateItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiReview" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "month" TIMESTAMP(3) NOT NULL,
  "status" "KpiReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "templateSnapshot" JSONB NOT NULL,
  "totalAchievementPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "monthlyPointScore" INTEGER NOT NULL DEFAULT 0,
  "performanceCategory" TEXT NOT NULL DEFAULT 'Poor Performer',
  "overallRemarks" TEXT,
  "createdById" TEXT NOT NULL,
  "finalizedById" TEXT,
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KpiReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiReviewItem" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "templateItemId" TEXT,
  "name" TEXT NOT NULL,
  "weightage" DOUBLE PRECISION NOT NULL,
  "measurement" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "rating" INTEGER,
  "achievementPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "actualAchievement" TEXT,
  "remarks" TEXT,
  "weightedAchievement" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "KpiReviewItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "kpiDepartmentId" TEXT;

CREATE UNIQUE INDEX "KpiDepartment_parentId_name_key" ON "KpiDepartment"("parentId", "name");
CREATE INDEX "KpiDepartment_parentId_active_sortOrder_idx" ON "KpiDepartment"("parentId", "active", "sortOrder");
CREATE INDEX "KpiTemplate_departmentId_active_idx" ON "KpiTemplate"("departmentId", "active");
CREATE INDEX "KpiTemplateItem_templateId_active_sortOrder_idx" ON "KpiTemplateItem"("templateId", "active", "sortOrder");
CREATE UNIQUE INDEX "KpiReview_userId_month_key" ON "KpiReview"("userId", "month");
CREATE INDEX "KpiReview_month_status_idx" ON "KpiReview"("month", "status");
CREATE INDEX "KpiReview_departmentId_month_idx" ON "KpiReview"("departmentId", "month");
CREATE INDEX "KpiReviewItem_reviewId_sortOrder_idx" ON "KpiReviewItem"("reviewId", "sortOrder");
CREATE INDEX "User_kpiDepartmentId_idx" ON "User"("kpiDepartmentId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_kpiDepartmentId_fkey" FOREIGN KEY ("kpiDepartmentId") REFERENCES "KpiDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KpiDepartment"
  ADD CONSTRAINT "KpiDepartment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KpiDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiTemplate"
  ADD CONSTRAINT "KpiTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "KpiDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiTemplateItem"
  ADD CONSTRAINT "KpiTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "KpiTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiReview"
  ADD CONSTRAINT "KpiReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiReview"
  ADD CONSTRAINT "KpiReview_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "KpiDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KpiReview"
  ADD CONSTRAINT "KpiReview_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "KpiTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KpiReview"
  ADD CONSTRAINT "KpiReview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KpiReview"
  ADD CONSTRAINT "KpiReview_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KpiReviewItem"
  ADD CONSTRAINT "KpiReviewItem_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "KpiReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiReviewItem"
  ADD CONSTRAINT "KpiReviewItem_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "KpiTemplateItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "SystemSetting" ("key", "value", "updatedAt", "updatedById")
VALUES
  ('kpi.monthlyTarget', '20000', CURRENT_TIMESTAMP, NULL),
  ('kpi.annualTarget', '240000', CURRENT_TIMESTAMP, NULL),
  ('kpi.ratingScale', '{"5":120,"4":100,"3":80,"2":60,"1":40}', CURRENT_TIMESTAMP, NULL)
ON CONFLICT ("key") DO NOTHING;
