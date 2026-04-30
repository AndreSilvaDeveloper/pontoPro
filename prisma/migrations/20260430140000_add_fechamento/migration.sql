-- CreateTable
CREATE TABLE "Fechamento" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "funcionarioId" TEXT NOT NULL,
  "adminCriadorId" TEXT NOT NULL,
  "periodoInicio" TIMESTAMP(3) NOT NULL,
  "periodoFim" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "snapshot" JSONB NOT NULL,
  "assinadoEm" TIMESTAMP(3),
  "assinaturaUrl" TEXT,
  "ipAssinatura" TEXT,
  "userAgentAssinatura" TEXT,
  "recusadoEm" TIMESTAMP(3),
  "recusadoMotivo" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Fechamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fechamento_empresaId_status_idx" ON "Fechamento"("empresaId", "status");

-- CreateIndex
CREATE INDEX "Fechamento_funcionarioId_status_idx" ON "Fechamento"("funcionarioId", "status");

-- CreateIndex
CREATE INDEX "Fechamento_periodoInicio_periodoFim_idx" ON "Fechamento"("periodoInicio", "periodoFim");

-- AddForeignKey
ALTER TABLE "Fechamento" ADD CONSTRAINT "Fechamento_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fechamento" ADD CONSTRAINT "Fechamento_adminCriadorId_fkey" FOREIGN KEY ("adminCriadorId") REFERENCES "Usuario"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
