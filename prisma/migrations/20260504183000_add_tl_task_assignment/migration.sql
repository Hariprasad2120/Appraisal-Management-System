ALTER TABLE "KpiReviewItem"
  ADD COLUMN "assignedToEmployee" BOOLEAN NOT NULL DEFAULT false;

UPDATE "KpiReviewItem" item
SET "assignedToEmployee" = true
FROM "KpiReview" review
WHERE item."reviewId" = review."id"
  AND item."itemKind" = 'TASK'
  AND (review."status" = 'FINALIZED' OR item."rating" IS NOT NULL);
