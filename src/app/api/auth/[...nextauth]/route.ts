import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Busca o usuário no banco
        const user = await prisma.usuario.findUnique({
          where: { email: credentials.email }
        });

        // Verifica se usuário existe e se a senha bate
        // (Nota: Em produção, usaríamos bcrypt para comparar hash, mas vamos usar texto puro para seu teste com '123')
        if (user && user.senha === credentials.password) {
          return {
            id: user.id,
            name: user.nome,
            email: user.email,
          };
        }

        return null; // Login falhou
      }
    })
  ],
  pages: {
    signIn: '/login', // Nossa página de login personalizada
  },
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        // @ts-ignore
        session.user.id = token.sub; // Passa o ID do usuário para a sessão
      }
      return session;
    }
  }
});

export { handler as GET, handler as POST };