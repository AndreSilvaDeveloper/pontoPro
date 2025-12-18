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

        // Retorna o usuário com os campos iniciais
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

      // Mantemos isso caso você use update() no front, mas a lógica principal será no session()
      if (trigger === "update" && session) {
        return { ...token, ...session };
      }

      return token;
    },
    
    // === AQUI ESTÁ A CORREÇÃO MÁGICA ===
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // @ts-ignore
        session.user.cargo = token.cargo;
        // @ts-ignore
        session.user.deveTrocarSenha = token.deveTrocarSenha;

        // BUSCA FRESCA NO BANCO DE DADOS
        // Isso garante que se trocou de loja via API, a sessão pega o ID novo imediatamente
        try {
            // Usamos o ID do usuário (token.id) para ver qual empresa está salva no banco AGORA
            const usuarioFresco = await prisma.usuario.findUnique({
                where: { id: token.id as string },
                select: { 
                  empresaId: true, 
                  empresa: { select: { nome: true } } 
                }
            });

            if (usuarioFresco) {
                // @ts-ignore
                session.user.empresaId = usuarioFresco.empresaId;
                // @ts-ignore
                session.user.nomeEmpresa = usuarioFresco.empresa?.nome; // Útil para mostrar o nome no seletor
            } else {
                // Fallback (se der erro no banco, usa o do token)
                // @ts-ignore
                session.user.empresaId = token.empresaId;
            }
        } catch (e) {
            console.error("Erro ao atualizar sessão via banco", e);
            // @ts-ignore
            session.user.empresaId = token.empresaId;
        }
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