import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { compare } from "bcryptjs"; // <--- 1. IMPORT CORRIGIDO

const SUPER_EMAIL = "super@workid.com";
const MASTER_KEY_ENV = process.env.SAAS_MASTER_KEY || "minha-senha-secreta";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // 1. SUPER ADMIN
        if (credentials.email === SUPER_EMAIL && credentials.password === MASTER_KEY_ENV) {
            return {
                id: 'super-admin-id',
                name: 'Super Admin',
                email: SUPER_EMAIL,
                cargo: 'SUPER_ADMIN',
                empresaId: 'saas-global',
                deveTrocarSenha: false
            };
        }

        // 2. LOGIN NORMAL
        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email },
          include: { empresa: true }
        });

        if (!usuario) return null;

        // 3. BLOQUEIO SAAS
        // @ts-ignore - Ignora erro se o TS ainda não reconhecer 'status'
        if (usuario.empresa && usuario.empresa.status === 'BLOQUEADO') {
            throw new Error('ACESSO SUSPENSO. Contate o suporte.');
        }

        // 4. VERIFICAÇÃO DE SENHA (CORRIGIDA PARA 'senha')
        // @ts-ignore - Ignora erro se o TS ainda achar que é 'password'
        if (!usuario.senha) return null;

        // Compara a senha digitada (credentials.password) com a do banco (usuario.senha)
        // @ts-ignore
        const senhaValida = await compare(credentials.password, usuario.senha);
        
        if (!senhaValida) return null;

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo,
          empresaId: usuario.empresaId || "",
          deveTrocarSenha: usuario.deveTrocarSenha
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.cargo = user.cargo;
        token.empresaId = user.empresaId;
        token.deveTrocarSenha = user.deveTrocarSenha;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.cargo = token.cargo;
        session.user.empresaId = token.empresaId;
        session.user.deveTrocarSenha = token.deveTrocarSenha;
      }
      return session;
    }
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };