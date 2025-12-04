import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() // Simples assim!

async function main() {
  const usuario = await prisma.usuario.upsert({
    where: { email: 'funcionario@teste.com' },
    update: {},
    create: {
      email: 'funcionario@teste.com',
      nome: 'João Silva',
      senha: '123',
      latitudeBase: -21.766, 
      longitudeBase: -43.350,
      raioPermitido: 20000000, 
    },
  })
  console.log('Usuário criado com sucesso:', usuario)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })