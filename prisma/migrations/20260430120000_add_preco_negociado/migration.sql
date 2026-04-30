-- AlterTable Empresa: adiciona override de preço negociado por cliente
ALTER TABLE "Empresa"
  ADD COLUMN "precoNegociado" DECIMAL(10,2),
  ADD COLUMN "precoNegociadoMotivo" TEXT,
  ADD COLUMN "precoNegociadoExpiraEm" TIMESTAMP(3);
