/**
 * Migra arquivos do Vercel Blob → Storage Local.
 * Usa a API @vercel/blob para obter URLs com token de download.
 */

const { PrismaClient } = require('@prisma/client');
const { list, head } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();

const LOCAL_DIR = process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'uploads');
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function baixarBlob(blobUrl) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
  };

  const res = await fetch(blobUrl, { headers });
  if (res.ok) return Buffer.from(await res.arrayBuffer());

  throw new Error(`HTTP ${res.status}`);
}

async function salvarLocal(blobUrl, categoria, prefixo) {
  const buffer = await baixarBlob(blobUrl);
  const ext = path.extname(new URL(blobUrl).pathname) || '.bin';
  const hash = crypto.randomBytes(6).toString('hex');
  const filename = `${prefixo}-${hash}${ext}`;
  const relativePath = path.join(categoria, filename);
  const absolutePath = path.join(LOCAL_DIR, relativePath);

  ensureDir(absolutePath);
  fs.writeFileSync(absolutePath, buffer);

  return `${BASE_URL}/api/uploads/${relativePath.replace(/\\/g, '/')}`;
}

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

// Encontrar blob pelo userId no pathname
function encontrarBlob(blobs, padrao, userId) {
  // Tentar match exato com userId
  let found = blobs.find(b => b.pathname?.includes(padrao) && b.pathname?.includes(userId));
  if (found) return found;
  // Tentar match parcial (primeiros 15 chars do ID)
  found = blobs.find(b => b.pathname?.includes(padrao) && b.pathname?.includes(userId.substring(0, 15)));
  return found || null;
}

async function main() {
  console.log('=== Migração Vercel Blob → Local ===');
  console.log(`LOCAL_DIR: ${LOCAL_DIR}`);
  console.log(`BASE_URL: ${BASE_URL}\n`);

  console.log('Listando blobs na Vercel...');
  const blobs = await listarTodosBlobs();
  console.log(`Total de blobs: ${blobs.length}\n`);

  // Testar download de 1 blob para verificar acesso
  if (blobs.length > 0) {
    console.log('Testando acesso...');
    try {
      const testBlob = blobs[0];
      await baixarBlob(testBlob.url);
      console.log(`✓ Acesso OK (testou: ${testBlob.pathname})\n`);
    } catch (e) {
      console.log(`✗ Acesso FALHOU: ${e.message}`);
      console.log('  Verifique se BLOB_READ_WRITE_TOKEN está correto no .env');
      console.log('  Ou se o plano Vercel ainda está ativo.\n');

      // Tentar abordagem alternativa: usar blob store API direta
      console.log('Tentando abordagem alternativa (API store)...');
      try {
        const info = await head(blobs[0].url);
        console.log(`Head OK: ${info.pathname}, size: ${info.size}`);
      } catch (e2) {
        console.log(`Head falhou: ${e2.message}`);
        console.log('\nAbortando. Os arquivos não estão acessíveis pela API.\n');
        await prisma.$disconnect();
        return;
      }
    }
  }

  let total = 0;
  let erros = 0;

  // Fotos de perfil
  console.log('--- Fotos de perfil ---');
  const usuarios = await prisma.usuario.findMany({
    where: { fotoPerfilUrl: { not: null } },
    select: { id: true, nome: true, fotoPerfilUrl: true, email: true },
  });

  for (const u of usuarios) {
    if (!u.fotoPerfilUrl) continue;
    // Encontrar blob original na Vercel
    const blob = encontrarBlob(blobs, 'referencia-', u.id)
      || blobs.find(b => b.pathname?.includes(`referencia-${(u.email || '').replace('@', '-')}`));
    if (!blob) { console.log(`  ✗ ${u.nome} - blob não encontrado na Vercel`); erros++; continue; }
    try {
      const novaUrl = await salvarLocal(blob.url, 'permanente', `perfil-${u.id}`);
      await prisma.usuario.update({ where: { id: u.id }, data: { fotoPerfilUrl: novaUrl } });
      console.log(`  ✓ ${u.nome}`);
      total++;
    } catch (e) {
      console.log(`  ✗ ${u.nome}: ${e.message}`);
      erros++;
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
    if (!blob) { console.log(`  ✗ ${u.nome} - blob não encontrado`); erros++; continue; }
    try {
      const novaUrl = await salvarLocal(blob.url, 'permanente', `assinatura-${u.id}`);
      await prisma.usuario.update({ where: { id: u.id }, data: { assinaturaUrl: novaUrl } });
      console.log(`  ✓ ${u.nome}`);
      total++;
    } catch (e) {
      console.log(`  ✗ ${u.nome}: ${e.message}`);
      erros++;
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
    if (!blob) { console.log(`  ✗ ${u.nome} - blob não encontrado`); erros++; continue; }
    try {
      const novaUrl = await salvarLocal(blob.url, 'permanente', `ciencia-${u.id}`);
      await prisma.usuario.update({ where: { id: u.id }, data: { cienciaCelularDocUrl: novaUrl } });
      console.log(`  ✓ ${u.nome}`);
      total++;
    } catch (e) {
      console.log(`  ✗ ${u.nome}: ${e.message}`);
      erros++;
    }
  }

  // Logos revendedores
  console.log('\n--- Logos ---');
  const revs = await prisma.revendedor.findMany({
    where: { logoUrl: { not: null } },
    select: { id: true, nome: true, logoUrl: true },
  });
  for (const r of revs) {
    if (!r.logoUrl) continue;
    const blob = encontrarBlob(blobs, 'logo-', r.id);
    if (!blob) { console.log(`  ✗ ${r.nome} - blob não encontrado`); erros++; continue; }
    try {
      const novaUrl = await salvarLocal(blob.url, 'permanente', `logo-${r.id}`);
      await prisma.revendedor.update({ where: { id: r.id }, data: { logoUrl: novaUrl } });
      console.log(`  ✓ ${r.nome}`);
      total++;
    } catch (e) {
      console.log(`  ✗ ${r.nome}: ${e.message}`);
      erros++;
    }
  }

  // Limpar fotos de ponto antigas (Vercel)
  console.log('\n--- Limpando URLs temporárias ---');
  const pontosLimpos = await prisma.ponto.updateMany({
    where: { fotoUrl: { not: null }, NOT: { fotoUrl: { contains: '/api/uploads/' } } },
    data: { fotoUrl: null },
  });
  console.log(`  ${pontosLimpos.count} fotos de ponto limpas`);

  console.log(`\n=== RESULTADO ===`);
  console.log(`Migrados: ${total}`);
  console.log(`Erros: ${erros}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
