import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Criando ambiente SaaS...')

  // 1. Criar a Empresa "Padaria do Cliente"
  const empresa = await prisma.empresa.create({
    data: {
      nome: 'Padaria do João (Cliente 01)',
      cnpj: '12.345.678/0001-90',
    }
  })

  console.log(`🏢 Empresa criada: ${empresa.nome}`)

  // 2. Criar o DONO (Admin)
  // Ele entra, cadastra os funcionários e gerencia tudo.
  const admin = await prisma.usuario.create({
    data: {
      nome: 'João Dono',
      email: 'admin@padaria.com',
      senha: '1234', // Senha inicial
      cargo: 'ADMIN',
      empresaId: empresa.id,
      latitudeBase: -21.766,
      longitudeBase: -43.350,
      raioPermitido: 500, 
    }
  })

  // 3. Criar um FUNCIONÁRIO (Para testar o bloqueio de senha)
  const funcionario = await prisma.usuario.create({
    data: {
      nome: 'Maria Balconista',
      email: 'maria@padaria.com',
      senha: 'mudar123', // Senha temporária
      cargo: 'FUNCIONARIO',
      deveTrocarSenha: true, // <--- O PULO DO GATO (Vai pedir pra trocar)
      empresaId: empresa.id,
      latitudeBase: -21.766,
      longitudeBase: -43.350,
      raioPermitido: 200, 
    }
  })

  console.log(`✅ Tudo pronto! Logue com: ${admin.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })