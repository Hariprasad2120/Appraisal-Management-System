ALTER TABLE "SystemSetting" DROP CONSTRAINT "SystemSetting_pkey";

ALTER TABLE "SystemSetting"
  ADD COLUMN "id" TEXT;

UPDATE "SystemSetting"
SET "id" = 'setting_' || md5("organizationId" || ':' || "key")
WHERE "id" IS NULL;

ALTER TABLE "SystemSetting"
  ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "SystemSetting"
  ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "SystemSetting_organizationId_key_key"
ON "SystemSetting"("organizationId", "key");

CREATE INDEX "SystemSetting_key_idx"
ON "SystemSetting"("key");
