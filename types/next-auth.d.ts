import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  // Melhora a tipagem da Sessão (uso no front e back)
  interface Session {
    user: {
      id: string
      cargo: string
      empresaId: string | null
      deveTrocarSenha: boolean
    } & DefaultSession["user"]
  }

  // Melhora a tipagem do Usuário (retorno do authorize)
  interface User {
     id: string
     cargo: string
     empresaId: string | null
     deveTrocarSenha: boolean
     // Adicione outros campos se precisar
     nome?: string 
     email?: string
  }
}

declare module "next-auth/jwt" {
  // Melhora a tipagem do Token
  interface JWT {
    id: string
    cargo: string
    empresaId: string | null
    deveTrocarSenha: boolean
  }
}