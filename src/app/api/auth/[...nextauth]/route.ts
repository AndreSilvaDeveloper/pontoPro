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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const login = credentials.email.trim();
        const password = credentials.password.trim();

        // (A) BUSCA USER — aceita e-mail OU CPF (só números, com ou sem pontuação)
        const soDigitos = login.replace(/\D/g, "");
        const pareceCpf = soDigitos.length === 11 && /^[\d.\s-]+$/.test(login);

        const user = await prisma.usuario.findFirst({
          where: pareceCpf
            ? { OR: [{ cpf: soDigitos }, { cpf: login }] }
            : { email: { equals: login, mode: "insensitive" } },
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

        if (!user?.senha) {
          return null;
        }

        // (B) BCRYPT
        const ok = await bcrypt.compare(password, user.senha);
        if (!ok) {
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

          if (matriz) empresa = matriz;
        }

        if (!empresa) {
          return null;
        }

        // (F) billing — calculado mesmo sem log: o redirect pra /acesso_bloqueado
        // acontece no client com base na session callback abaixo.
        getBillingStatus(empresa as any);

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

  events: {
    async signOut({ token }) {
      try {
        const userId = (token as any)?.id ?? (token as any)?.sub;
        if (userId) {
          await prisma.usuario.updateMany({
            where: { id: userId as string, resetToken: { startsWith: 'refresh:' } },
            data: { resetToken: null, resetTokenExpiry: null },
          });
        }
      } catch (e) {
        console.error('events.signOut cleanup failed:', e);
      }
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