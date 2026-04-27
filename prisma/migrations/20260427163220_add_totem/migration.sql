-- AlterTable Empresa
ALTER TABLE "Empresa"
  ADD COLUMN "addonTotem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rekognitionCollection" TEXT;

-- AlterTable Usuario
ALTER TABLE "Usuario" ADD COLUMN "rekognitionFaceId" TEXT;

-- AlterTable Ponto
ALTER TABLE "Ponto"
  ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'APP',
  ADD COLUMN "totemId" TEXT;

-- CreateTable TotemDevice
CREATE TABLE "totem_device" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "codigoExpiraEm" TIMESTAMP(3),
    "token" TEXT,
    "pareadoEm" TIMESTAMP(3),
    "ultimoUso" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "totem_device_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "totem_device_codigo_key" ON "totem_device"("codigo");
CREATE UNIQUE INDEX "totem_device_token_key" ON "totem_device"("token");
CREATE INDEX "totem_device_empresaId_idx" ON "totem_device"("empresaId");

-- FK
ALTER TABLE "totem_device"
  ADD CONSTRAINT "totem_device_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
