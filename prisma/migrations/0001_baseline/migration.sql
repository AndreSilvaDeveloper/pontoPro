-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configuracoes" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "intervaloPago" BOOLEAN NOT NULL DEFAULT false,
    "fluxoEstrito" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "tituloCargo" TEXT,
    "fotoPerfilUrl" TEXT,
    "jornada" JSONB,
    "assinaturaUrl" TEXT,
    "cargo" TEXT NOT NULL DEFAULT 'FUNCIONARIO',
    "deveTrocarSenha" BOOLEAN NOT NULL DEFAULT false,
    "empresaId" TEXT,
    "latitudeBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longitudeBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "raioPermitido" INTEGER NOT NULL DEFAULT 100,
    "pontoLivre" BOOLEAN NOT NULL DEFAULT false,
    "locaisAdicionais" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLoja" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "AdminLoja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ponto" (
    "id" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "endereco" TEXT,
    "fotoUrl" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'NORMAL',
    "subTipo" TEXT,
    "descricao" TEXT,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Ponto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoAjuste" (
    "id" TEXT NOT NULL,
    "novoHorario" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tipo" TEXT,
    "usuarioId" TEXT NOT NULL,
    "pontoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoAjuste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ausencia" (
    "id" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "comprovanteUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ausencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feriado" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "nome" TEXT NOT NULL,
    "empresaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feriado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acao" TEXT NOT NULL,
    "detalhes" TEXT NOT NULL,
    "adminNome" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "LogAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminLoja_usuarioId_empresaId_key" ON "AdminLoja"("usuarioId", "empresaId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLoja" ADD CONSTRAINT "AdminLoja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLoja" ADD CONSTRAINT "AdminLoja_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ponto" ADD CONSTRAINT "Ponto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoAjuste" ADD CONSTRAINT "SolicitacaoAjuste_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoAjuste" ADD CONSTRAINT "SolicitacaoAjuste_pontoId_fkey" FOREIGN KEY ("pontoId") REFERENCES "Ponto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ausencia" ADD CONSTRAINT "Ausencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feriado" ADD CONSTRAINT "Feriado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

