import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email }
        });

        if (!usuario) return null;

        const senhaCorreta = await compare(credentials.password, usuario.senha);

        if (!senhaCorreta) return null;

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo,
          // Aqui garantimos que não quebra se for nulo, mas o dado real vem do callback abaixo
          empresaId: usuario.empresaId || "", 
          deveTrocarSenha: usuario.deveTrocarSenha
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

        // === CORREÇÃO FUNDAMENTAL ===
        // Busca o usuário no banco AGORA para pegar a loja que está ativa neste momento.
        // Sem isso, ele ficaria preso na loja do momento do login.
        try {
            const usuarioAtualizado = await prisma.usuario.findUnique({
                where: { id: token.sub },
                select: { empresaId: true, cargo: true, nome: true }
            });

            if (usuarioAtualizado) {
                session.user.empresaId = usuarioAtualizado.empresaId || "";
                session.user.cargo = usuarioAtualizado.cargo;
                session.user.name = usuarioAtualizado.nome;
            }
        } catch (error) {
            console.error("Erro ao atualizar sessão:", error);
        }
        // ============================
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };