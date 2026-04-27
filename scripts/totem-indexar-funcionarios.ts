// scripts/totem-indexar-funcionarios.ts
//
// Indexa rostos dos funcionários JÁ EXISTENTES na coleção AWS Rekognition.
// Usar quando ativar o addonTotem de uma empresa pela primeira vez.
//
// Uso:
//   npx tsx scripts/totem-indexar-funcionarios.ts <empresaId>
//   npx tsx scripts/totem-indexar-funcionarios.ts --all   (todas com addonTotem=true)
//
// Idempotente: se o usuário já tem rekognitionFaceId, remove e reindexa.
// Funcionários sem fotoPerfilUrl são pulados.

import { PrismaClient } from '@prisma/client';
import { reindexarRostoUsuario } from '../src/lib/totem';

const prisma = new PrismaClient();

async function indexarEmpresa(empresaId: string) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nome: true,
      addonTotem: true,
      matrizId: true,
    },
  });

  if (!empresa) {
    console.error(`❌ Empresa ${empresaId} não encontrada.`);
    return { ok: 0, skip: 0, fail: 0 };
  }

  // checa addon (própria ou da matriz)
  let temAddon = empresa.addonTotem;
  if (!temAddon && empresa.matrizId) {
    const matriz = await prisma.empresa.findUnique({
      where: { id: empresa.matrizId },
      select: { addonTotem: true },
    });
    temAddon = matriz?.addonTotem === true;
  }

  if (!temAddon) {
    console.warn(`⚠️  Empresa "${empresa.nome}" não tem addonTotem ativo — pulando.`);
    return { ok: 0, skip: 0, fail: 0 };
  }

  const funcionarios = await prisma.usuario.findMany({
    where: { empresaId: empresa.id },
    select: { id: true, nome: true, fotoPerfilUrl: true, rekognitionFaceId: true },
  });

  console.log(`\n🏢 ${empresa.nome} (${funcionarios.length} funcionários)`);

  let ok = 0, skip = 0, fail = 0;

  for (const f of funcionarios) {
    if (!f.fotoPerfilUrl) {
      console.log(`   ⏭️  ${f.nome} — sem foto`);
      skip++;
      continue;
    }
    try {
      await reindexarRostoUsuario(f.id);
      const atualizado = await prisma.usuario.findUnique({
        where: { id: f.id },
        select: { rekognitionFaceId: true },
      });
      if (atualizado?.rekognitionFaceId) {
        console.log(`   ✅ ${f.nome} — faceId=${atualizado.rekognitionFaceId.slice(0, 8)}…`);
        ok++;
      } else {
        console.log(`   ⚠️  ${f.nome} — rosto não detectado na foto`);
        fail++;
      }
    } catch (err) {
      console.error(`   ❌ ${f.nome} — erro:`, err);
      fail++;
    }
  }

  return { ok, skip, fail };
}

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.error('Uso: npx tsx scripts/totem-indexar-funcionarios.ts <empresaId|--all>');
    process.exit(1);
  }

  let empresas: { id: string }[];

  if (arg === '--all') {
    empresas = await prisma.empresa.findMany({
      where: { addonTotem: true },
      select: { id: true },
    });
    console.log(`🔎 ${empresas.length} empresa(s) com addonTotem ativo.`);
  } else {
    empresas = [{ id: arg }];
  }

  let totalOk = 0, totalSkip = 0, totalFail = 0;

  for (const emp of empresas) {
    const r = await indexarEmpresa(emp.id);
    totalOk += r.ok;
    totalSkip += r.skip;
    totalFail += r.fail;
  }

  console.log(`\n📊 Resumo: ${totalOk} indexados, ${totalSkip} pulados (sem foto), ${totalFail} falharam.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
