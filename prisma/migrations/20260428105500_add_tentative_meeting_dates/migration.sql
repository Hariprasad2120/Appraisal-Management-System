-- Add tentative meeting dates (management proposes two)
ALTER TABLE "AppraisalCycle" ADD COLUMN IF NOT EXISTS "tentativeDate1" TIMESTAMP(3);
ALTER TABLE "AppraisalCycle" ADD COLUMN IF NOT EXISTS "tentativeDate2" TIMESTAMP(3);

