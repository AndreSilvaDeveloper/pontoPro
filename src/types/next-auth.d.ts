import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      cargo: string;
      empresaId: string;
      deveTrocarSenha: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }

  interface User {
    id: string;
    cargo: string;
    empresaId: string;
    deveTrocarSenha: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    cargo: string;
    empresaId: string;
    deveTrocarSenha: boolean;
  }
}