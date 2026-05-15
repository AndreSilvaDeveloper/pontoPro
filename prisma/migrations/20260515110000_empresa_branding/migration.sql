-- Identidade visual da empresa (personalização do painel admin/funcionário)
ALTER TABLE "Empresa"
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "nomeExibicao" TEXT,
  ADD COLUMN "corPrimaria" TEXT DEFAULT '#7c3aed';
