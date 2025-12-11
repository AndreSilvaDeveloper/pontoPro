// scripts/criar-cliente.ts
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs'); // <--- IMPORTANTE: Adicionamos o bcrypt aqui
const prisma = new PrismaClient();

async function criarCliente() {
  // --- DADOS DO NOVO CLIENTE ---
  const NOME_EMPRESA = "Mercadinho do Bairro";
  const CNPJ = "99.999.999/0001-99";
  const EMAIL_DONO = "dono@mercadinho.com";
  const NOME_DONO = "Sr. Manoel";
  
  // AQUI ESTÁ A MUDANÇA:
  const SENHA_INICIAL = "1234"; 
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

    // 2. Criptografa a senha antes de salvar
    const senhaCriptografada = await hash(SENHA_INICIAL, 10);

    // 3. Cria o Usuário Admin (Dono)
    const dono = await prisma.usuario.create({
      data: {
        nome: NOME_DONO,
        email: EMAIL_DONO,
        password: senhaCriptografada, // <--- Atenção: O campo no seu banco é 'password' ou 'senha'? 
        // Se no seu schema.prisma o campo for 'password', mantenha 'password'. 
        // Se for 'senha', mude para 'senha: senhaCriptografada'.
        // Baseado no seu último código de API, parece ser 'password'.
        
        cargo: 'ADMIN',
        empresaId: empresa.id,
        deveTrocarSenha: true,
      }
    });

    console.log(`
    🎉 Venda Concluída!
    -----------------------------------
    Cliente: ${NOME_EMPRESA}
    Login:   ${EMAIL_DONO}
    Senha:   ${SENHA_INICIAL}
    -----------------------------------
    `);

  } catch (e) {
    console.error("Erro ao criar:", e);
  } finally {
    await prisma.$disconnect();
  }
}

criarCliente();