/**
 * Corrige URLs que ficaram apontando para localhost no banco de produção.
 * Troca "http://localhost:3000/api/uploads/" por "https://ontimeia.com/api/uploads/"
 *
 * Uso: node scripts/corrigir-urls-producao.js
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const DE = 'http://localhost:3000/api/uploads/';
const PARA = 'https://ontimeia.com/api/uploads/';

async function main() {
  console.log(`Corrigindo URLs: ${DE} → ${PARA}\n`);

  // fotoPerfilUrl
  const usuarios = await p.usuario.findMany({
    where: { fotoPerfilUrl: { contains: DE } },
    select: { id: true, nome: true, fotoPerfilUrl: true },
  });
  for (const u of usuarios) {
    await p.usuario.update({
      where: { id: u.id },
      data: { fotoPerfilUrl: u.fotoPerfilUrl.replace(DE, PARA) },
    });
  }
  console.log(`fotoPerfilUrl: ${usuarios.length} corrigidos`);

  // assinaturaUrl
  const assinaturas = await p.usuario.findMany({
    where: { assinaturaUrl: { contains: DE } },
    select: { id: true, assinaturaUrl: true },
  });
  for (const u of assinaturas) {
    await p.usuario.update({
      where: { id: u.id },
      data: { assinaturaUrl: u.assinaturaUrl.replace(DE, PARA) },
    });
  }
  console.log(`assinaturaUrl: ${assinaturas.length} corrigidos`);

  // cienciaCelularDocUrl
  const ciencias = await p.usuario.findMany({
    where: { cienciaCelularDocUrl: { contains: DE } },
    select: { id: true, cienciaCelularDocUrl: true },
  });
  for (const u of ciencias) {
    await p.usuario.update({
      where: { id: u.id },
      data: { cienciaCelularDocUrl: u.cienciaCelularDocUrl.replace(DE, PARA) },
    });
  }
  console.log(`cienciaCelularDocUrl: ${ciencias.length} corrigidos`);

  // logoUrl (revendedor)
  const logos = await p.revendedor.findMany({
    where: { logoUrl: { contains: DE } },
    select: { id: true, logoUrl: true },
  });
  for (const r of logos) {
    await p.revendedor.update({
      where: { id: r.id },
      data: { logoUrl: r.logoUrl.replace(DE, PARA) },
    });
  }
  console.log(`logoUrl: ${logos.length} corrigidos`);

  console.log('\nPronto! URLs corrigidas para https://ontimeia.com');
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
