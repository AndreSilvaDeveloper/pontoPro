-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "whatsapp" TEXT,
    "empresa" TEXT,
    "cargo" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "referrer" TEXT,
    "dadosExtras" JSONB,
    "status" TEXT NOT NULL DEFAULT 'NOVO',
    "obs" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_origem_idx" ON "lead"("origem");

-- CreateIndex
CREATE INDEX "lead_status_idx" ON "lead"("status");

-- CreateIndex
CREATE INDEX "lead_criadoEm_idx" ON "lead"("criadoEm");
