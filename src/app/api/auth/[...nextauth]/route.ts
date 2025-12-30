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
          where: { email: credentials.email },
          include: { 
            empresa: true 
          }
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

        // === MUDANÇA PRINCIPAL AQUI ===
        // A mensagem exata que vai aparecer no Toast vermelho
        if (user.cargo !== 'SUPER_ADMIN' && user.empresa && user.empresa.status === 'BLOQUEADO') {
            throw new Error("🚫 ACESSO SUSPENSO: Sua empresa foi bloqueada pelo Administrador.");
        }

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          // @ts-ignore
          cargo: user.cargo,
          // @ts-ignore
          empresaId: user.empresaId,
          // @ts-ignore
          deveTrocarSenha: user.deveTrocarSenha 
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.cargo = user.cargo;
        // @ts-ignore
        token.empresaId = user.empresaId;
        // @ts-ignore
        token.deveTrocarSenha = user.deveTrocarSenha;
      }

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
        session.user.deveTrocarSenha = token.deveTrocarSenha;

        try {
            const usuarioFresco = await prisma.usuario.findUnique({
                where: { id: token.id as string },
                select: { 
                  empresaId: true, 
                  empresa: { select: { nome: true, status: true } } 
                }
            });

            if (usuarioFresco) {
                // Checagem de expulsão (se foi bloqueado enquanto navegava)
                // @ts-ignore
                if (session.user.cargo !== 'SUPER_ADMIN' && usuarioFresco.empresa?.status === 'BLOQUEADO') {
                     // @ts-ignore
                     session.error = "BLOQUEADO"; 
                }

                // @ts-ignore
                session.user.empresaId = usuarioFresco.empresaId;
                // @ts-ignore
                session.user.nomeEmpresa = usuarioFresco.empresa?.nome; 
            } else {
                // @ts-ignore
                session.user.empresaId = token.empresaId;
            }
        } catch (e) {
            console.error("Erro sessão", e);
            // @ts-ignore
            session.user.empresaId = token.empresaId;
        }
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };