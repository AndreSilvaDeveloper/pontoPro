const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const DE = 'http://localhost:3000';

async function fix(model, campo) {
  const registros = await p[model].findMany({
    where: { [campo]: { startsWith: DE } },
    select: { id: true, [campo]: true },
  });
  for (const r of registros) {
    await p[model].update({
      where: { id: r.id },
      data: { [campo]: r[campo].replace(DE, '') },
    });
  }
  console.log(`${model}.${campo}: ${registros.length} corrigidos`);
}

async function main() {
  await fix('usuario', 'fotoPerfilUrl');
  await fix('usuario', 'assinaturaUrl');
  await fix('usuario', 'cienciaCelularDocUrl');
  await fix('ponto', 'fotoUrl');
  await fix('ausencia', 'comprovanteUrl');
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
