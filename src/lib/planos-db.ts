import { prisma } from '@/lib/db';
import { PLANOS, type PlanoConfig, type PlanoId, PLANO_DEFAULT } from '@/config/planos';

export type PlanoCompleto = PlanoConfig & {
  ordem: number;
  destaque: boolean;
  visivel: boolean;
  atualizadoEm?: Date;
};

function planoFromDb(row: any): PlanoCompleto {
  return {
    id: row.id as PlanoId,
    nome: row.nome,
    descricao: row.descricao,
    preco: Number(row.preco),
    maxFuncionarios: row.maxFuncionarios,
    maxAdmins: row.maxAdmins,
    maxFiliais: row.maxFiliais,
    extraFuncionario: Number(row.extraFuncionario),
    extraAdmin: Number(row.extraAdmin),
    extraFilial: Number(row.extraFilial),
    reconhecimentoFacial: row.reconhecimentoFacial,
    relatoriosPdf: row.relatoriosPdf,
    suporte: row.suporte,
    totemIncluso: row.totemIncluso,
    totemAddonMatriz: Number(row.totemAddonMatriz),
    totemAddonFilial: Number(row.totemAddonFilial),
    ordem: row.ordem,
    destaque: row.destaque,
    visivel: row.visivel,
    atualizadoEm: row.atualizadoEm,
  };
}

/**
 * Garante que os planos hardcoded existam no banco. Roda no primeiro acesso.
 * Não altera valores se já existirem (evita sobrescrever edição manual).
 */
export async function seedPlanosIfNeeded(): Promise<void> {
  const count = await (prisma as any).plano.count();
  if (count > 0) return;

  const ordemPadrao: Record<PlanoId, number> = {
    STARTER: 1,
    PROFESSIONAL: 2,
    ENTERPRISE: 3,
  };
  const destaquePadrao: Record<PlanoId, boolean> = {
    STARTER: false,
    PROFESSIONAL: true,
    ENTERPRISE: false,
  };

  for (const plano of Object.values(PLANOS)) {
    await (prisma as any).plano.create({
      data: {
        ...plano,
        ordem: ordemPadrao[plano.id],
        destaque: destaquePadrao[plano.id],
        visivel: true,
      },
    });
  }
}

/**
 * Lê os planos do banco. Se o banco estiver vazio (1ª execução), faz seed automaticamente.
 * Se algo der errado, cai no hardcoded.
 */
export async function getPlanosFromDB(): Promise<PlanoCompleto[]> {
  try {
    let rows = await (prisma as any).plano.findMany({
      orderBy: { ordem: 'asc' },
    });
    if (rows.length === 0) {
      await seedPlanosIfNeeded();
      rows = await (prisma as any).plano.findMany({ orderBy: { ordem: 'asc' } });
    }
    return rows.map(planoFromDb);
  } catch (e) {
    console.error('getPlanosFromDB falhou, usando hardcoded:', e);
    return Object.values(PLANOS).map((p, i) => ({
      ...p,
      ordem: i + 1,
      destaque: p.id === 'PROFESSIONAL',
      visivel: true,
    }));
  }
}

/**
 * Versão filtrada: apenas planos visíveis (pra landing).
 */
export async function getPlanosPublicos(): Promise<PlanoCompleto[]> {
  const todos = await getPlanosFromDB();
  return todos.filter(p => p.visivel);
}

export async function getPlanoById(id: string): Promise<PlanoCompleto | null> {
  try {
    const row = await (prisma as any).plano.findUnique({ where: { id } });
    if (row) return planoFromDb(row);
  } catch {}
  const hardcoded = PLANOS[id as PlanoId];
  if (!hardcoded) return null;
  return {
    ...hardcoded,
    ordem: 0,
    destaque: hardcoded.id === 'PROFESSIONAL',
    visivel: true,
  };
}

export const PLANO_DEFAULT_DB = PLANO_DEFAULT;
