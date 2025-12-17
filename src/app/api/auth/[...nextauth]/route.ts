import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Dados de login inválidos");
        }

        const user = await prisma.usuario.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.senha) {
          throw new Error("Usuário não encontrado");
        }

        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.senha
        );

        if (!isPasswordCorrect) {
          throw new Error("Senha incorreta");
        }

        // Retorna o usuário com os campos que precisamos
        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          // @ts-ignore
          cargo: user.cargo,
          // @ts-ignore
          empresaId: user.empresaId,
          // @ts-ignore
          deveTrocarSenha: user.deveTrocarSenha // <--- ISSO É O QUE FALTAVA
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Passa os dados do login inicial para o token
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.cargo = user.cargo;
        // @ts-ignore
        token.empresaId = user.empresaId;
        // @ts-ignore
        token.deveTrocarSenha = user.deveTrocarSenha;
      }

      // Permite atualizar a sessão sem deslogar (útil para troca de loja)
      if (trigger === "update" && session) {
        return { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // @ts-ignore
        session.user.cargo = token.cargo;
        // @ts-ignore
        session.user.empresaId = token.empresaId;
        // @ts-ignore
        session.user.deveTrocarSenha = token.deveTrocarSenha; // <--- Passa para o Front
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };