-- Auth hardening, passkey reset workflow, message retrigger logging, and import/reset support.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'REVIEWER';

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "passkeyHash" TEXT,
  ADD COLUMN IF NOT EXISTS "passkeySetupRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "googleLoginAllowed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "email" = lower(trim("email"))
WHERE "email" <> lower(trim("email"));

CREATE TABLE IF NOT EXISTS "LoginChallenge" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'credentials',
  "redirectTo" TEXT NOT NULL DEFAULT '/',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PasskeyResetRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "decidedById" TEXT,
  "reason" TEXT,
  CONSTRAINT "PasskeyResetRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageRetriggerLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "notificationId" TEXT,
  "messageType" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageRetriggerLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoginChallenge_tokenHash_key" ON "LoginChallenge"("tokenHash");
CREATE INDEX IF NOT EXISTS "LoginChallenge_userId_expiresAt_idx" ON "LoginChallenge"("userId", "expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");
CREATE INDEX IF NOT EXISTS "PasskeyResetRequest_status_requestedAt_idx" ON "PasskeyResetRequest"("status", "requestedAt");
CREATE INDEX IF NOT EXISTS "PasskeyResetRequest_userId_status_idx" ON "PasskeyResetRequest"("userId", "status");
CREATE INDEX IF NOT EXISTS "MessageRetriggerLog_actorId_createdAt_idx" ON "MessageRetriggerLog"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "MessageRetriggerLog_recipientId_createdAt_idx" ON "MessageRetriggerLog"("recipientId", "createdAt");

ALTER TABLE "LoginChallenge"
  ADD CONSTRAINT "LoginChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasskeyResetRequest"
  ADD CONSTRAINT "PasskeyResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasskeyResetRequest"
  ADD CONSTRAINT "PasskeyResetRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageRetriggerLog"
  ADD CONSTRAINT "MessageRetriggerLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageRetriggerLog"
  ADD CONSTRAINT "MessageRetriggerLog_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageRetriggerLog"
  ADD CONSTRAINT "MessageRetriggerLog_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
