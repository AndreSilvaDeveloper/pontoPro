// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

import { getBillingStatus, buildBillingBlockPayload } from "@/lib/billing";

export const runtime = "nodejs";

async function getEmpresaCobrancaMatrizOuPropria(empresaId: string) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nome: true,
      status: true,
      matrizId: true,

      cobrancaAtiva: true,
      trialAte: true,
      pagoAte: true,

      diaVencimento: true,
      billingAnchorAt: true,

      chavePix: true,
      cobrancaWhatsapp: true,
    },
  });

  if (!empresa) return null;

  if (empresa.matrizId) {
    const matriz = await prisma.empresa.findUnique({
      where: { id: empresa.matrizId },
      select: {
        id: true,
        nome: true,
        status: true,
        matrizId: true,

        cobrancaAtiva: true,
        trialAte: true,
        pagoAte: true,

        diaVencimento: true,
        billingAnchorAt: true,

        chavePix: true,
        cobrancaWhatsapp: true,
      },
    });

    return matriz ?? empresa;
  }

  return empresa;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Dados de login inválidos");
        }

        const email = credentials.email.trim().toLowerCase();

        const user = await prisma.usuario.findUnique({
          where: { email },
          select: {
            id: true,
            nome: true,
            email: true,
            senha: true,
            cargo: true,
            empresaId: true,
            deveTrocarSenha: true,
          },
        });

        // Mensagem única (não vaza se existe ou não)
        if (!user?.senha) {
          throw new Error("Usuário ou senha inválidos");
        }

        // ✅ 1) valida senha primeiro (não expõe billing pra quem erra senha)
        const ok = await bcrypt.compare(credentials.password, user.senha);
        if (!ok) {
          throw new Error("Usuário ou senha inválidos");
        }

        // ✅ 2) SUPER_ADMIN nunca bloqueia
        if (user.cargo !== "SUPER_ADMIN") {
          if (!user.empresaId) {
            throw new Error("Usuário sem empresa associada");
          }

          const empresa = await getEmpresaCobrancaMatrizOuPropria(user.empresaId);
          if (!empresa) {
            throw new Error("Empresa não encontrada");
          }

          const st = getBillingStatus(empresa as any);

          if (st.blocked) {
            const payload = buildBillingBlockPayload({
              code: st.code,
              motivo: st.message,
              empresaId: empresa.id,
              empresaNome: empresa.nome,
              email: user.email,
              dueAtISO: st.dueAt ?? undefined,
              overdueDays: st.days ?? undefined,
              chavePix: (empresa as any).chavePix ?? null,
              cobrancaWhatsapp: (empresa as any).cobrancaWhatsapp ?? null,
            });

            throw new Error(`BILLING_BLOCK:${payload}`);
          }
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
          deveTrocarSenha: user.deveTrocarSenha,
        } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as any).id;
        token.cargo = (user as any).cargo;
        token.empresaId = (user as any).empresaId;
        token.deveTrocarSenha = (user as any).deveTrocarSenha;
      }

      if (trigger === "update" && session) {
        return { ...token, ...session };
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).cargo = token.cargo;
        (session.user as any).deveTrocarSenha = token.deveTrocarSenha;

        try {
          const usuarioFresco = await prisma.usuario.findUnique({
            where: { id: token.id as string },
            select: {
              empresaId: true,
              cargo: true,
              empresa: {
                select: {
                  id: true,
                  nome: true,
                  status: true,
                  matrizId: true,

                  cobrancaAtiva: true,
                  trialAte: true,
                  pagoAte: true,

                  diaVencimento: true,
                  billingAnchorAt: true,

                  chavePix: true,
                  cobrancaWhatsapp: true,
                },
              },
            },
          });

          if (usuarioFresco) {
            (session.user as any).empresaId = usuarioFresco.empresaId;
            (session.user as any).nomeEmpresa = usuarioFresco.empresa?.nome;

            // Se estiver bloqueado enquanto navega, seu guard pode redirecionar
            const cargo = (session.user as any).cargo;
            if (cargo !== "SUPER_ADMIN" && usuarioFresco.empresaId) {
              // resolve matriz/filial também na sessão
              const empresa = await getEmpresaCobrancaMatrizOuPropria(usuarioFresco.empresaId);

              if (empresa) {
                const st = getBillingStatus(empresa as any);

                if (st.blocked) {
                  (session as any).error = "BILLING_BLOCK";
                  (session as any).billing = {
                    empresaId: empresa.id,
                    empresaNome: empresa.nome,
                    code: st.code,
                    message: st.message,
                    dueAt: st.dueAt,
                    days: st.days,
                    chavePix: (empresa as any).chavePix ?? null,
                    diaVencimento: (empresa as any).diaVencimento ?? 15,
                    cobrancaWhatsapp: (empresa as any).cobrancaWhatsapp ?? null,
                    cobrancaAtiva: (empresa as any).cobrancaAtiva ?? true,
                  };
                }
              }
            }
          } else {
            (session.user as any).empresaId = token.empresaId;
          }
        } catch (e) {
          console.error("Erro sessão", e);
          (session.user as any).empresaId = token.empresaId;
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
