-- Provento: lançamento de crédito/acréscimo (salário do mês, periculosidade, HE, etc.)

CREATE TABLE "Provento" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "funcionarioId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'OUTROS',
  "descricao" TEXT NOT NULL,
  "valor" DECIMAL(10, 2) NOT NULL,
  "mesReferencia" INTEGER NOT NULL,
  "anoReferencia" INTEGER NOT NULL,
  "parcelaAtual" INTEGER NOT NULL DEFAULT 1,
  "parcelaTotal" INTEGER NOT NULL DEFAULT 1,
  "loteId" TEXT,
  "observacao" TEXT,
  "criadoPorId" TEXT,
  "criadoPorNome" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Provento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Provento_empresaId_anoReferencia_mesReferencia_idx"
  ON "Provento"("empresaId", "anoReferencia", "mesReferencia");

CREATE INDEX "Provento_funcionarioId_anoReferencia_mesReferencia_idx"
  ON "Provento"("funcionarioId", "anoReferencia", "mesReferencia");

CREATE INDEX "Provento_loteId_idx" ON "Provento"("loteId");

ALTER TABLE "Provento"
  ADD CONSTRAINT "Provento_funcionarioId_fkey"
  FOREIGN KEY ("funcionarioId") REFERENCES "Usuario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Provento"
  ADD CONSTRAINT "Provento_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
