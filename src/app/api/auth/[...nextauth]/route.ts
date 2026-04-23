// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

import { getBillingStatus, buildBillingBlockPayload } from "@/lib/billing";
import { verifyToken, consumeBackupCode } from "@/lib/twoFactor";

export const runtime = "nodejs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA", type: "text" },
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
            revendedorId: true,
            deveTrocarSenha: true,
            deveCadastrarFoto: true,
            deveDarCienciaCelular: true,
            assinaturaUrl: true,
            twoFactorEnabled: true,
            twoFactorSecret: true,
            twoFactorBackupCodes: true,
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

        // (B.1) 2FA — se habilitado, exige código TOTP ou backup
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const code = (credentials.twoFactorCode || '').trim();
          if (!code) {
            // Sinal pro frontend: pedir código
            throw new Error('2FA_REQUIRED');
          }
          let twoFAok = verifyToken(user.twoFactorSecret, code);

          // Se falhou, tenta como backup code
          if (!twoFAok && Array.isArray(user.twoFactorBackupCodes)) {
            const restantes = consumeBackupCode(user.twoFactorBackupCodes as string[], code);
            if (restantes) {
              twoFAok = true;
              await prisma.usuario.update({
                where: { id: user.id },
                data: { twoFactorBackupCodes: restantes },
              });
            }
          }

          if (!twoFAok) {
            throw new Error('2FA_INVALID');
          }
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
            revendedorId: user.revendedorId ?? null,
            deveTrocarSenha: user.deveTrocarSenha,
            deveCadastrarFoto: user.deveCadastrarFoto,
            deveDarCienciaCelular: user.deveDarCienciaCelular,
            temAssinatura: !!user.assinaturaUrl,
          } as any;
        }

        // (C2) REVENDEDOR
        if (user.cargo === "REVENDEDOR") {
          console.log("OK: REVENDEDOR");
          return {
            id: user.id,
            name: user.nome,
            email: user.email,
            cargo: user.cargo,
            empresaId: null,
            revendedorId: user.revendedorId ?? null,
            deveTrocarSenha: false,
            deveCadastrarFoto: false,
            deveDarCienciaCelular: false,
            temAssinatura: true,
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

        // Billing bloqueado: permite login (sessão é criada),
        // o redirect para /acesso_bloqueado acontece no client/layout.
        if (st.blocked) {
          console.log("BILLING_BLOCK: login permitido, redirect será feito no client");
        } else {
          console.log("OK: LOGIN SUCCESS");
        }

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          cargo: user.cargo,
          empresaId: user.empresaId,
          deveTrocarSenha: user.deveTrocarSenha,
          deveCadastrarFoto: user.deveCadastrarFoto,
          deveDarCienciaCelular: user.deveDarCienciaCelular,
          temAssinatura: !!user.assinaturaUrl,
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
        (token as any).revendedorId = (user as any).revendedorId ?? null;
        token.deveTrocarSenha = (user as any).deveTrocarSenha;
        token.deveCadastrarFoto = (user as any).deveCadastrarFoto;
        token.deveDarCienciaCelular = (user as any).deveDarCienciaCelular;
        token.temAssinatura = (user as any).temAssinatura;

        // ✅ preserve se alguém (ex: endpoint de impersonação) já setou isso no user
        token.impersonatedBy = (user as any).impersonatedBy ?? (token as any).impersonatedBy ?? null;
      }

      if (trigger === "update" && session) {
        // ✅ mantém o impersonatedBy (caso o update sobrescreva)
        return { ...token, ...session, impersonatedBy: (token as any).impersonatedBy ?? null };
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        // ✅ fallback: se token.id não existir (ex: token criado via encode com sub),
        // usa token.sub
        (session.user as any).id = ((token as any).id ?? (token as any).sub) as string;

        (session.user as any).cargo = (token as any).cargo;
        (session.user as any).empresaId =
          ((token as any).empresaId as string | null) ?? null;

        (session.user as any).revendedorId = (token as any).revendedorId ?? null;

        // ✅ expõe a marca de impersonação no session
        (session.user as any).impersonatedBy = (token as any).impersonatedBy ?? null;

        // ✅ Impersonate: forçar flags para pular todo onboarding
        if ((token as any).impersonatedBy) {
          (session.user as any).deveTrocarSenha = false;
          (session.user as any).deveCadastrarFoto = false;
          (session.user as any).deveDarCienciaCelular = false;
          (session.user as any).temAssinatura = true;
        } else {
          (session.user as any).deveTrocarSenha = (token as any).deveTrocarSenha;
          (session.user as any).deveCadastrarFoto = (token as any).deveCadastrarFoto;
          (session.user as any).deveDarCienciaCelular = (token as any).deveDarCienciaCelular;
          (session.user as any).temAssinatura = (token as any).temAssinatura;
        }

        // SUPER_ADMIN não precisa buscar empresa e não bloqueia
        if ((session.user as any).cargo === "SUPER_ADMIN") {
          return session;
        }

        // REVENDEDOR não tem empresa, não bloqueia
        if ((session.user as any).cargo === "REVENDEDOR") {
          return session;
        }

        try {
          const usuarioFresco = await prisma.usuario.findUnique({
            where: { id: ((token as any).id ?? (token as any).sub) as string },
            select: {
              empresaId: true,
              empresa: {
                select: {
                  id: true,
                  nome: true,
                  status: true,
                  matrizId: true,
                  chavePix: true,
                  diaVencimento: true,
                  cobrancaAtiva: true,
                  trialAte: true,
                  pagoAte: true,
                  billingAnchorAt: true,
                  cobrancaWhatsapp: true,
                },
              },
            },
          });

          if (usuarioFresco) {
            (session.user as any).empresaId = usuarioFresco.empresaId ?? null;
            (session.user as any).nomeEmpresa =
              usuarioFresco.empresa?.nome ?? null;

            // Resolve empresa de billing (se for filial, usa a matriz)
            let billingEmpresa = usuarioFresco.empresa;
            if (usuarioFresco.empresa?.matrizId) {
              const matriz = await prisma.empresa.findUnique({
                where: { id: usuarioFresco.empresa.matrizId },
                select: {
                  id: true,
                  nome: true,
                  status: true,
                  matrizId: true,
                  chavePix: true,
                  diaVencimento: true,
                  cobrancaAtiva: true,
                  trialAte: true,
                  pagoAte: true,
                  billingAnchorAt: true,
                  cobrancaWhatsapp: true,
                },
              });
              if (matriz) billingEmpresa = matriz;
            }

            // Usa getBillingStatus() (com tolerância de 10 dias, anchor, etc.)
            const st = getBillingStatus(billingEmpresa as any);

            if (st.blocked) {
              const billingData = {
                empresaNome: billingEmpresa?.nome,
                chavePix: billingEmpresa?.chavePix,
                diaVencimento: billingEmpresa?.diaVencimento,
                trialAte: billingEmpresa?.trialAte,
                pagoAte: billingEmpresa?.pagoAte,
                status: billingEmpresa?.status,
                cobrancaAtiva: billingEmpresa?.cobrancaAtiva,
                cobrancaWhatsapp: billingEmpresa?.cobrancaWhatsapp,
              };

              const isImpersonating = !!(session.user as any).impersonatedBy;

              if (isImpersonating) {
                (session as any).billingWarning = billingData;
              } else {
                (session as any).error = "BILLING_BLOCK";
                (session as any).billing = billingData;
              }
            }
          }
        } catch (e) {
          console.error("Erro sessão", e);
        }
      }

      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 90 * 24 * 60 * 60, // 90 dias
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 90 * 24 * 60 * 60, // 90 dias
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };