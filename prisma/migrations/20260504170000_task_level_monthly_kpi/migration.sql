CREATE TYPE "KpiItemKind" AS ENUM ('CRITERION', 'TASK');
CREATE TYPE "KpiApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'DISAPPROVED');
CREATE TYPE "KpiTaskCompletionStatus" AS ENUM ('NOT_COMPLETED', 'PARTIALLY_COMPLETED', 'FULLY_COMPLETED');

ALTER TABLE "KpiTemplateItem"
  ADD COLUMN "parentItemId" TEXT,
  ADD COLUMN "itemKind" "KpiItemKind" NOT NULL DEFAULT 'TASK',
  ADD COLUMN "description" TEXT;

ALTER TABLE "KpiReview"
  ADD COLUMN "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "KpiReviewItem"
  ADD COLUMN "parentItemId" TEXT,
  ADD COLUMN "itemKind" "KpiItemKind" NOT NULL DEFAULT 'TASK',
  ADD COLUMN "description" TEXT,
  ADD COLUMN "completionStatus" "KpiTaskCompletionStatus" NOT NULL DEFAULT 'NOT_COMPLETED',
  ADD COLUMN "approvalStatus" "KpiApprovalStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "approvalRemarks" TEXT,
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3);

ALTER TABLE "KpiReviewItem"
  ALTER COLUMN "rating" TYPE DOUBLE PRECISION USING "rating"::DOUBLE PRECISION;

CREATE INDEX "KpiTemplateItem_parentItemId_sortOrder_idx" ON "KpiTemplateItem"("parentItemId", "sortOrder");
CREATE INDEX "KpiReviewItem_parentItemId_sortOrder_idx" ON "KpiReviewItem"("parentItemId", "sortOrder");
CREATE INDEX "KpiReviewItem_approvalStatus_idx" ON "KpiReviewItem"("approvalStatus");

ALTER TABLE "KpiTemplateItem"
  ADD CONSTRAINT "KpiTemplateItem_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "KpiTemplateItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KpiReviewItem"
  ADD CONSTRAINT "KpiReviewItem_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "KpiReviewItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KpiReviewItem"
  ADD CONSTRAINT "KpiReviewItem_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "SystemSetting"
SET "value" = '{"5":110,"4":100,"3":80,"2":60,"1":40}', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'kpi.ratingScale';
