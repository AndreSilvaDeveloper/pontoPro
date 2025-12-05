import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      cargo: string;
      empresaId: string;
      deveTrocarSenha: boolean;
    } & DefaultSession["user"]
  }

  interface User {
    cargo: string;
    empresaId: string;
    deveTrocarSenha: boolean;
  }
}