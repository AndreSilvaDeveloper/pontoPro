// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

import { getBillingStatus, buildBillingBlockPayload } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * (legado) usado só para bloquear DURANTE navegação via session callback
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
        console.log("=== AUTH START ===");

        if (!credentials?.email || !credentials?.password) {
          console.log("FAIL: missing credentials");
          return null;
        }

        const email = credentials.email.trim();
        const password = credentials.password.trim();

        console.log("EMAIL_RAW:", JSON.stringify(credentials.email));
        console.log("EMAIL_NORM:", JSON.stringify(email));
        console.log("PASS_LEN:", password.length);

        // (A) BUSCA USER
        const user = await prisma.usuario.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
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

        console.log("USER_FOUND?", !!user);
        console.log(
          "USER_DATA:",
          user
            ? {
                id: user.id,
                email: user.email,
                cargo: user.cargo,
                empresaId: user.empresaId,
                hasSenha: !!user.senha,
              }
            : null
        );

        if (!user?.senha) {
          console.log("FAIL: user not found OR missing senha");
          return null;
        }

        // (B) BCRYPT
        const ok = await bcrypt.compare(password, user.senha);
        console.log("BCRYPT_OK?", ok);

        if (!ok) {
          console.log("FAIL: wrong password (bcrypt)");
          return null;
        }

        // (C) SUPER_ADMIN
        if (user.cargo === "SUPER_ADMIN") {
          console.log("OK: SUPER_ADMIN");
          return {
            id: user.id,
            name: user.nome,
            email: user.email,
            cargo: user.cargo,
            empresaId: user.empresaId ?? null,
            deveTrocarSenha: user.deveTrocarSenha,
          } as any;
        }

        // (D) empresaId obrigatório
        if (!user.empresaId) {
          console.log("FAIL: user without empresaId");
          return null;
        }

        // (E) empresa
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
            chavePix: true,
            diaVencimento: true,
            billingAnchorAt: true,
            cobrancaWhatsapp: true,
          },
        });

        console.log(
          "EMPRESA_FOUND?",
          !!empresaUser,
          empresaUser
            ? {
                id: empresaUser.id,
                nome: empresaUser.nome,
                status: empresaUser.status,
                matrizId: empresaUser.matrizId,
                cobrancaAtiva: empresaUser.cobrancaAtiva,
              }
            : null
        );

        let empresa: any = empresaUser;

        // (E.1) matriz logic
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
              chavePix: true,
              diaVencimento: true,
              billingAnchorAt: true,
              cobrancaWhatsapp: true,
            },
          });

          console.log(
            "MATRIZ_FOUND?",
            !!matriz,
            matriz
              ? {
                  id: matriz.id,
                  nome: matriz.nome,
                  status: matriz.status,
                  cobrancaAtiva: matriz.cobrancaAtiva,
                }
              : null
          );

          if (matriz) empresa = matriz;
        }

        if (!empresa) {
          console.log("FAIL: empresa not found after matriz logic");
          return null;
        }

        // (F) billing
        const st = getBillingStatus(empresa as any);
        console.log("BILLING_STATUS:", {
          blocked: st.blocked,
          code: st.code,
          message: st.message,
        });

        // ✅ BLOQUEIO: manda payload via result.error (funciona no client)
        if (st.blocked) {
          console.log("FAIL: BILLING_BLOCK");

          const payload = {
            code: st.code,
            motivo: st.message,

            empresaId: empresa.id,
            empresaNome: empresa.nome,

            email: user.email ?? null,

            chavePix: empresa.chavePix ?? null,
            cobrancaWhatsapp: empresa.cobrancaWhatsapp ?? null,
            diaVencimento: empresa.diaVencimento ?? null,

            trialAteISO: empresa.trialAte
              ? new Date(empresa.trialAte).toISOString()
              : null,
            pagoAteISO: empresa.pagoAte
              ? new Date(empresa.pagoAte).toISOString()
              : null,

            dueAtISO: st.dueAtISO ?? null,
            overdueDays: st.days ?? null,
          };

          const token = buildBillingBlockPayload(payload as any);

          // 🔥 Este formato chega no client em result.error
          throw new Error(`BILLING_BLOCK:${token}`);
        }

        console.log("OK: LOGIN SUCCESS");

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          cargo: user.cargo,
          empresaId: user.empresaId,
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
        (session.user as any).empresaId =
          (token.empresaId as string | null) ?? null;
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
                  cobrancaWhatsapp: true,
                },
              },
            },
          });

          if (usuarioFresco) {
            (session.user as any).empresaId = usuarioFresco.empresaId ?? null;
            (session.user as any).nomeEmpresa =
              usuarioFresco.empresa?.nome ?? null;

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
                cobrancaWhatsapp: usuarioFresco.empresa?.cobrancaWhatsapp,
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

  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
