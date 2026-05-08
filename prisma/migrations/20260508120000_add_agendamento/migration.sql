-- CreateTable
CREATE TABLE "agendamento" (
    "id" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "atendenteId" TEXT,
    "leadId" TEXT,
    "alteradoPor" TEXT,
    "alteradoEm" TIMESTAMP(3),
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agendamento_dataHora_key" ON "agendamento"("dataHora");

-- CreateIndex
CREATE INDEX "agendamento_status_idx" ON "agendamento"("status");

-- CreateIndex
CREATE INDEX "agendamento_leadId_idx" ON "agendamento"("leadId");

-- CreateIndex
CREATE INDEX "agendamento_dataHora_idx" ON "agendamento"("dataHora");

-- AddForeignKey
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
