-- AlterTable: adicionar campo plano com default PROFESSIONAL
ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "plano" TEXT NOT NULL DEFAULT 'PROFESSIONAL';

-- AlterTable: adicionar campo asaasSubscriptionId
ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "asaasSubscriptionId" TEXT;
