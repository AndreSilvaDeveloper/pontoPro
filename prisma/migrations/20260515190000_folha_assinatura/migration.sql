-- Folha de pagamento: assinatura do funcionário (similar ao Fechamento de ponto)

ALTER TABLE "FolhaPagamento"
  ADD COLUMN "assinadoEm" TIMESTAMP(3),
  ADD COLUMN "assinaturaUrl" TEXT,
  ADD COLUMN "ipAssinatura" TEXT,
  ADD COLUMN "userAgentAssinatura" TEXT,
  ADD COLUMN "recusadoEm" TIMESTAMP(3),
  ADD COLUMN "recusadoMotivo" TEXT;
