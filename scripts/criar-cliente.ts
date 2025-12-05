// scripts/criar-cliente.ts
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function criarCliente() {
  // --- DADOS DO NOVO CLIENTE (Edite aqui para cada venda) ---
  const NOME_EMPRESA = "Mercadinho do Bairro";
  const CNPJ = "99.999.999/0001-99";
  const EMAIL_DONO = "dono@mercadinho.com";
  const NOME_DONO = "Sr. Manoel";
  const SENHA_INICIAL = "mudar123";
  // ---------------------------------------------------------

  console.log(`🚀 Criando cliente: ${NOME_EMPRESA}...`);

  try {
    // 1. Cria a Empresa
    const empresa = await prisma.empresa.create({
      data: {
        nome: NOME_EMPRESA,
        cnpj: CNPJ,
      }
    });

    console.log(`✅ Empresa criada! ID: ${empresa.id}`);

    // 2. Cria o Usuário Admin (Dono)
    const dono = await prisma.usuario.create({
      data: {
        nome: NOME_DONO,
        email: EMAIL_DONO,
        senha: SENHA_INICIAL,
        cargo: 'ADMIN',
        empresaId: empresa.id, // VINCULA À EMPRESA NOVA
        deveTrocarSenha: true, // Força ele a trocar a senha
      }
    });

    console.log(`
    🎉 Venda Concluída!
    -----------------------------------
    Cliente: ${NOME_EMPRESA}
    Login:   ${EMAIL_DONO}
    Senha:   ${SENHA_INICIAL}
    -----------------------------------
    Entregue esses dados para o cliente.
    Ele vai logar e o sistema será SÓ DELE.
    `);

  } catch (e) {
    console.error("Erro ao criar:", e);
  } finally {
    await prisma.$disconnect();
  }
}

criarCliente();