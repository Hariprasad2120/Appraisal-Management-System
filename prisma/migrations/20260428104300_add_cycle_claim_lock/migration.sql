-- Add management claim/lock fields for appraisals
ALTER TABLE "AppraisalCycle" ADD COLUMN IF NOT EXISTS "claimedById" TEXT;
ALTER TABLE "AppraisalCycle" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);

-- Best-effort FK (Postgres)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AppraisalCycle_claimedById_fkey'
  ) THEN
    ALTER TABLE "AppraisalCycle"
      ADD CONSTRAINT "AppraisalCycle_claimedById_fkey"
      FOREIGN KEY ("claimedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AppraisalCycle_status_claimedById_idx" ON "AppraisalCycle"("status", "claimedById");

