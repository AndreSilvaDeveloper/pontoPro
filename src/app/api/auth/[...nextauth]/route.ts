import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

import { getBillingStatus, buildBillingBlockPayload } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Regra:
 * - SUPER_ADMIN pode logar sem empresaId (acesso total ao /saas).
 * - Outros cargos exigem empresaId.
 * - Bloqueio por cobrança/trial só para não-super-admin e apenas quando cobrancaAtiva = true.
 */
function isBillingBlockedLegacy(empresa: any) {
  if (!empresa) return false;

  // BLOQUEIO MANUAL
  if (empresa.status === "BLOQUEADO") return true;

  // Se cobrança não está ativa, não bloqueia por cobrança
  if (!empresa.cobrancaAtiva) return false;

  const now = new Date();
  const trialOk = empresa.trialAte ? now <= new Date(empresa.trialAte) : false;
  const paidOk = empresa.pagoAte ? now <= new Date(empresa.pagoAte) : false;

  // Se não está no trial e não está pago => bloqueia
  return !(trialOk || paidOk);
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

        // 1) Busca usuário (sem travar por empresa aqui)
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

        // mensagem genérica ajuda segurança (não revela existência do e-mail)
        if (!user?.senha) {
          throw new Error("Usuário ou senha inválidos");
        }

        // 2) Valida senha PRIMEIRO
        const ok = await bcrypt.compare(credentials.password, user.senha);
        if (!ok) {
          throw new Error("Usuário ou senha inválidos");
        }

        // 3) ✅ SUPER_ADMIN pode logar SEM empresa
        if (user.cargo === "SUPER_ADMIN") {
          return {
            id: user.id,
            name: user.nome,
            email: user.email,
            // @ts-ignore
            cargo: user.cargo,
            // @ts-ignore
            empresaId: user.empresaId ?? null,
            // @ts-ignore
            deveTrocarSenha: user.deveTrocarSenha,
          } as any;
        }

        // 4) Outros cargos precisam de empresaId
        if (!user.empresaId) {
          throw new Error("Usuário sem empresa associada");
        }

        // 5) Pega empresa do usuário e, se for filial, usa a matriz para cobrança
        const empresaUser = await prisma.empresa.findUnique({
          where: { id: user.empresaId },
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

        let empresa = empresaUser;

        if (empresaUser?.matrizId) {
          const matriz = await prisma.empresa.findUnique({
            where: { id: empresaUser.matrizId },
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

          if (matriz) empresa = matriz;
        }

        // 6) Bloqueio por cobrança/trial (NOVO: usando getBillingStatus)
        if (empresa) {
          const st = getBillingStatus(empresa as any);

          // st.blocked === true => deve bloquear login
          if (st.blocked) {
            const payload = buildBillingBlockPayload({
              code: st.code,
              motivo: st.message,
              empresaNome: empresa.nome,
              email: user.email,
              chavePix: empresa.chavePix ?? null,
            });

            throw new Error(`BILLING_BLOCK:${payload}`);
          }
        } else {
          // fallback defensivo: se não achou empresa
          throw new Error("Empresa não encontrada");
        }

        // 7) (Compat) fallback antigo caso você ainda use em algum lugar
        // Se algum trecho do app ainda depende disso, mantém coerência:
        // if (isBillingBlockedLegacy(empresa)) { ... }

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
        token.empresaId = (user as any).empresaId ?? null;
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
        (session.user as any).empresaId = (token.empresaId as string | null) ?? null;
        (session.user as any).deveTrocarSenha = token.deveTrocarSenha;

        // SUPER_ADMIN não precisa buscar empresa e não bloqueia
        if ((session.user as any).cargo === "SUPER_ADMIN") {
          return session;
        }

        try {
          const usuarioFresco = await prisma.usuario.findUnique({
            where: { id: token.id as string },
            select: {
              empresaId: true,
              empresa: {
                select: {
                  id: true,
                  nome: true,
                  status: true,
                  chavePix: true,
                  diaVencimento: true,
                  cobrancaAtiva: true,
                  trialAte: true,
                  pagoAte: true,
                },
              },
            },
          });

          if (usuarioFresco) {
            (session.user as any).empresaId = usuarioFresco.empresaId ?? null;
            (session.user as any).nomeEmpresa = usuarioFresco.empresa?.nome ?? null;

            // Se bloquear enquanto navega
            if (isBillingBlockedLegacy(usuarioFresco.empresa)) {
              (session as any).error = "BILLING_BLOCK";
              (session as any).billing = {
                empresaNome: usuarioFresco.empresa?.nome,
                chavePix: usuarioFresco.empresa?.chavePix,
                diaVencimento: usuarioFresco.empresa?.diaVencimento,
                trialAte: usuarioFresco.empresa?.trialAte,
                pagoAte: usuarioFresco.empresa?.pagoAte,
                status: usuarioFresco.empresa?.status,
                cobrancaAtiva: usuarioFresco.empresa?.cobrancaAtiva,
              };
            }
          }
        } catch (e) {
          console.error("Erro sessão", e);
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
