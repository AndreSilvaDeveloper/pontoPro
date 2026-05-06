-- CreateTable
CREATE TABLE "Plano" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "maxFuncionarios" INTEGER NOT NULL,
    "maxAdmins" INTEGER NOT NULL,
    "maxFiliais" INTEGER NOT NULL,
    "extraFuncionario" DECIMAL(10,2) NOT NULL,
    "extraAdmin" DECIMAL(10,2) NOT NULL,
    "extraFilial" DECIMAL(10,2) NOT NULL,
    "reconhecimentoFacial" BOOLEAN NOT NULL DEFAULT false,
    "relatoriosPdf" TEXT NOT NULL DEFAULT 'BASICO',
    "suporte" TEXT NOT NULL DEFAULT 'EMAIL',
    "totemIncluso" BOOLEAN NOT NULL DEFAULT false,
    "totemAddonMatriz" DECIMAL(10,2) NOT NULL,
    "totemAddonFilial" DECIMAL(10,2) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "visivel" BOOLEAN NOT NULL DEFAULT true,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cupom" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "duracaoMeses" INTEGER NOT NULL DEFAULT 1,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "visivelLanding" BOOLEAN NOT NULL DEFAULT false,
    "destaque" TEXT,
    "validoDe" TIMESTAMP(3),
    "validoAte" TIMESTAMP(3),
    "maxUsos" INTEGER,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "apenasNovos" BOOLEAN NOT NULL DEFAULT false,
    "apenasPlanos" TEXT[],
    "apenasCiclo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPor" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cupom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CupomUso" (
    "id" TEXT NOT NULL,
    "cupomId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "parcelasAplicadas" INTEGER NOT NULL DEFAULT 0,
    "parcelasMax" INTEGER NOT NULL DEFAULT 1,
    "valorAplicadoTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ativadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiradoEm" TIMESTAMP(3),

    CONSTRAINT "CupomUso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cupom_codigo_key" ON "Cupom"("codigo");

-- CreateIndex
CREATE INDEX "Cupom_ativo_codigo_idx" ON "Cupom"("ativo", "codigo");

-- CreateIndex
CREATE INDEX "Cupom_visivelLanding_ativo_idx" ON "Cupom"("visivelLanding", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "CupomUso_cupomId_empresaId_key" ON "CupomUso"("cupomId", "empresaId");

-- CreateIndex
CREATE INDEX "CupomUso_empresaId_idx" ON "CupomUso"("empresaId");

-- AddForeignKey
ALTER TABLE "CupomUso" ADD CONSTRAINT "CupomUso_cupomId_fkey" FOREIGN KEY ("cupomId") REFERENCES "Cupom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
