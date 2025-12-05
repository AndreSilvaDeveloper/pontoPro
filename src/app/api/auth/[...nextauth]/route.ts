import NextAuth, { AuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";

// Tipagem para o TypeScript
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

// === AQUI ESTÁ A MUDANÇA: Exportamos as opções separadamente ===
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.usuario.findUnique({
          where: { email: credentials.email }
        });

        if (user && user.senha === credentials.password) {
          return {
            id: user.id,
            name: user.nome,
            email: user.email,
            cargo: user.cargo,
            empresaId: user.empresaId || "",
            deveTrocarSenha: user.deveTrocarSenha
          };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.cargo = user.cargo;
        token.empresaId = user.empresaId;
        token.deveTrocarSenha = user.deveTrocarSenha;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.cargo = token.cargo as string;
        session.user.empresaId = token.empresaId as string;
        session.user.deveTrocarSenha = token.deveTrocarSenha as boolean;
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };