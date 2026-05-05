-- CreateTable
CREATE TABLE "ConfigSistema" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'texto',
    "descricao" TEXT,
    "categoria" TEXT DEFAULT 'geral',
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigSistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigSistema_chave_key" ON "ConfigSistema"("chave");

-- CreateIndex
CREATE INDEX "ConfigSistema_categoria_idx" ON "ConfigSistema"("categoria");
