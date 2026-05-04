-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "destinatarioId" TEXT,
    "tipo" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "url" TEXT,
    "metadata" JSONB,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacao_destinatarioId_lida_criadoEm_idx" ON "Notificacao"("destinatarioId", "lida", "criadoEm");

-- CreateIndex
CREATE INDEX "Notificacao_tipo_criadoEm_idx" ON "Notificacao"("tipo", "criadoEm");

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
