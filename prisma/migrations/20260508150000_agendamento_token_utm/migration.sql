-- AlterTable
ALTER TABLE "agendamento"
  ADD COLUMN "tokenAcesso" TEXT,
  ADD COLUMN "utmSource" TEXT,
  ADD COLUMN "utmMedium" TEXT,
  ADD COLUMN "utmCampaign" TEXT,
  ADD COLUMN "utmContent" TEXT,
  ADD COLUMN "utmTerm" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "agendamento_tokenAcesso_key" ON "agendamento"("tokenAcesso");
