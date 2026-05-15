-- Módulo Financeiro (addon opcional, controlado pelo super admin)

-- Empresa: gate do addon
ALTER TABLE "Empresa"
  ADD COLUMN "addonFinanceiro" BOOLEAN NOT NULL DEFAULT false;

-- Usuario: salário base do funcionário
ALTER TABLE "Usuario"
  ADD COLUMN "salarioBase" DECIMAL(10, 2);

-- Tabela de descontos lançados
CREATE TABLE "Desconto" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "funcionarioId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'OUTROS',
  "descricao" TEXT NOT NULL,
  "valorOriginal" DECIMAL(10, 2) NOT NULL,
  "percentualDesconto" DECIMAL(5, 2),
  "valorFinal" DECIMAL(10, 2) NOT NULL,
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

  CONSTRAINT "Desconto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Desconto_empresaId_anoReferencia_mesReferencia_idx"
  ON "Desconto"("empresaId", "anoReferencia", "mesReferencia");

CREATE INDEX "Desconto_funcionarioId_anoReferencia_mesReferencia_idx"
  ON "Desconto"("funcionarioId", "anoReferencia", "mesReferencia");

CREATE INDEX "Desconto_loteId_idx" ON "Desconto"("loteId");

ALTER TABLE "Desconto"
  ADD CONSTRAINT "Desconto_funcionarioId_fkey"
  FOREIGN KEY ("funcionarioId") REFERENCES "Usuario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Desconto"
  ADD CONSTRAINT "Desconto_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Tabela de folhas de pagamento (snapshot mensal)
CREATE TABLE "FolhaPagamento" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "funcionarioId" TEXT NOT NULL,
  "mes" INTEGER NOT NULL,
  "ano" INTEGER NOT NULL,
  "salarioBruto" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "totalProventos" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "totalDescontos" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "valorLiquido" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
  "fechadaEm" TIMESTAMP(3),
  "pagaEm" TIMESTAMP(3),
  "comprovanteUrl" TEXT,
  "observacao" TEXT,
  "detalhamento" JSONB NOT NULL,
  "adminCriadorId" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FolhaPagamento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FolhaPagamento_funcionarioId_ano_mes_key"
  ON "FolhaPagamento"("funcionarioId", "ano", "mes");

CREATE INDEX "FolhaPagamento_empresaId_ano_mes_idx"
  ON "FolhaPagamento"("empresaId", "ano", "mes");

CREATE INDEX "FolhaPagamento_status_idx" ON "FolhaPagamento"("status");

ALTER TABLE "FolhaPagamento"
  ADD CONSTRAINT "FolhaPagamento_funcionarioId_fkey"
  FOREIGN KEY ("funcionarioId") REFERENCES "Usuario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FolhaPagamento"
  ADD CONSTRAINT "FolhaPagamento_adminCriadorId_fkey"
  FOREIGN KEY ("adminCriadorId") REFERENCES "Usuario"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;
