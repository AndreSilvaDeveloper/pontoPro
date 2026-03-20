/**
 * Restaura URLs do Vercel Blob no banco de produção.
 * Encontra os blobs originais pela correspondência de ID do usuário
 * e atualiza as URLs de volta para as da Vercel.
 */

const { PrismaClient } = require('@prisma/client');
const { list } = require('@vercel/blob');

const prisma = new PrismaClient();

async function listarTodosBlobs() {
  const todos = [];
  let cursor;
  do {
    const res = await list({ cursor, limit: 1000 });
    todos.push(...res.blobs);
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  return todos;
}

function encontrarBlob(blobs, padrao, id) {
  return blobs.find(b => b.pathname?.includes(padrao) && b.pathname?.includes(id)) || null;
}

async function main() {
  console.log('Listando blobs na Vercel...');
  const blobs = await listarTodosBlobs();
  console.log(`Total: ${blobs.length}\n`);

  let total = 0;

  // Fotos de perfil
  console.log('--- Fotos de perfil ---');
  const usuarios = await prisma.usuario.findMany({
    where: { fotoPerfilUrl: { not: null } },
    select: { id: true, nome: true, email: true, fotoPerfilUrl: true },
  });

  for (const u of usuarios) {
    if (!u.fotoPerfilUrl) continue;
    // Tentar por ID
    let blob = encontrarBlob(blobs, 'referencia-', u.id);
    // Tentar por email
    if (!blob && u.email) {
      const emailKey = u.email.replace('@', '-');
      blob = blobs.find(b => b.pathname?.includes('referencia-') && b.pathname?.includes(emailKey));
    }
    if (blob && blob.url !== u.fotoPerfilUrl) {
      await prisma.usuario.update({ where: { id: u.id }, data: { fotoPerfilUrl: blob.url } });
      console.log(`  ✓ ${u.nome}`);
      total++;
    } else if (!blob) {
      console.log(`  - ${u.nome} (não encontrado na Vercel)`);
    }
  }

  // Assinaturas
  console.log('\n--- Assinaturas ---');
  const usrAss = await prisma.usuario.findMany({
    where: { assinaturaUrl: { not: null } },
    select: { id: true, nome: true, assinaturaUrl: true },
  });

  for (const u of usrAss) {
    if (!u.assinaturaUrl) continue;
    const blob = encontrarBlob(blobs, 'assinatura-', u.id);
    if (blob && blob.url !== u.assinaturaUrl) {
      await prisma.usuario.update({ where: { id: u.id }, data: { assinaturaUrl: blob.url } });
      console.log(`  ✓ ${u.nome}`);
      total++;
    }
  }

  // Ciência celular
  console.log('\n--- Ciência celular ---');
  const usrCie = await prisma.usuario.findMany({
    where: { cienciaCelularDocUrl: { not: null } },
    select: { id: true, nome: true, cienciaCelularDocUrl: true },
  });

  for (const u of usrCie) {
    if (!u.cienciaCelularDocUrl) continue;
    const blob = encontrarBlob(blobs, 'ciencia-celular-', u.id);
    if (blob && blob.url !== u.cienciaCelularDocUrl) {
      await prisma.usuario.update({ where: { id: u.id }, data: { cienciaCelularDocUrl: blob.url } });
      console.log(`  ✓ ${u.nome}`);
      total++;
    }
  }

  console.log(`\nRestaurados: ${total}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
