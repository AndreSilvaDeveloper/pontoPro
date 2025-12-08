import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs"; // <--- IMPORTAR

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Dados de login inválidos");
        }

        const user = await prisma.usuario.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.senha) {
          throw new Error("Usuário não encontrado");
        }

        // === MUDANÇA AQUI: CRIPTOGRAFIA ===
        // Verifica se a senha bate com o hash
        const senhaCorreta = await bcrypt.compare(credentials.password, user.senha);

        if (!senhaCorreta) {
          throw new Error("Senha incorreta");
        }
        // ==================================

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          cargo: user.cargo,
          empresaId: user.empresaId || "",
          deveTrocarSenha: user.deveTrocarSenha
        };
      }
    })
  ],
  // ... (resto do arquivo continua igual: callbacks, pages, secret)
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
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };