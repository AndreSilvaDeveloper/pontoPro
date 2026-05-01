// Reseta a senha de um usuário no banco LOCAL pra desenvolvimento.
// Uso:
//   node scripts/reset-senha-local.js <email> <novaSenha>
// Exemplo:
//   node scripts/reset-senha-local.js andrefonsecascjf@gmail.com teste1234

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const email = process.argv[2];
  const senha = process.argv[3];

  if (!email || !senha) {
    console.error("Uso: node scripts/reset-senha-local.js <email> <novaSenha>");
    process.exit(1);
  }

  // GUARD: aborta se o DATABASE_URL não parece ser local
  const url = process.env.DATABASE_URL || "";
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  if (!isLocal) {
    console.error("ABORT — DATABASE_URL não aponta pra localhost. Esse script é só pra dev.");
    console.error("URL atual (mascarada):", url.replace(/:[^:@]+@/, ":***@"));
    process.exit(3);
  }

  const prisma = new PrismaClient();
  try {
    const hash = bcrypt.hashSync(senha, 10);
    const r = await prisma.usuario.updateMany({
      where: { email },
      data: { senha: hash, deveTrocarSenha: false },
    });

    if (r.count === 0) {
      console.error(`Usuario ${email} não encontrado no banco LOCAL.`);
      process.exit(2);
    }

    console.log(`OK — senha de "${email}" redefinida para "${senha}" no banco LOCAL.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(99);
});
