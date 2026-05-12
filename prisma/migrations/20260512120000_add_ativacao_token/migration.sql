-- Link de ativação (primeiro acesso do funcionário)
ALTER TABLE "Usuario" ADD COLUMN "ativacaoToken" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "ativacaoTokenExpiry" TIMESTAMP(3);
CREATE UNIQUE INDEX "Usuario_ativacaoToken_key" ON "Usuario"("ativacaoToken");
