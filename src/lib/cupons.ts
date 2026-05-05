import { prisma } from '@/lib/db';

export type TipoCupom = 'PERCENTUAL' | 'VALOR_FIXO' | 'MESES_GRATIS' | 'TRIAL_ESTENDIDO';

export type CupomPublico = {
  id: string;
  codigo: string;
  nome: string;
  tipo: TipoCupom;
  valor: number;
  duracaoMeses: number;
  descricao: string | null;
  destaque: string | null;
  validoAte: string | null;
  apenasPlanos: string[];
  apenasCiclo: string | null;
};

export type ResultadoValidacao =
  | { ok: true; cupom: CupomPublico; descontoPreview: { valorOriginal: number; desconto: number; valorComDesconto: number; resumoTexto: string } | null }
  | { ok: false; erro: string; mensagem: string };

const ERROS: Record<string, string> = {
  NAO_ENCONTRADO: 'Cupom não encontrado',
  INATIVO: 'Cupom indisponível',
  EXPIRADO: 'Cupom expirado',
  AINDA_NAO_VALIDO: 'Cupom ainda não está vigente',
  ESGOTADO: 'Cupom esgotado (limite de usos atingido)',
  PLANO_NAO_ELEGIVEL: 'Cupom não vale para este plano',
  CICLO_NAO_ELEGIVEL: 'Cupom não vale para este ciclo de cobrança',
  APENAS_NOVOS: 'Cupom é apenas para novos clientes',
  JA_USADO: 'Esta empresa já usou este cupom',
};

export async function buscarCupom(codigo: string) {
  const codigoLimpo = codigo.trim().toUpperCase();
  if (!codigoLimpo) return null;
  return (prisma as any).cupom.findUnique({
    where: { codigo: codigoLimpo },
  });
}

export async function listarCuponsPublicos(): Promise<CupomPublico[]> {
  const now = new Date();
  const cupons = await (prisma as any).cupom.findMany({
    where: {
      ativo: true,
      visivelLanding: true,
      OR: [
        { validoAte: null },
        { validoAte: { gte: now } },
      ],
      AND: [
        {
          OR: [
            { validoDe: null },
            { validoDe: { lte: now } },
          ],
        },
      ],
    },
    orderBy: { criadoEm: 'desc' },
    take: 6,
  });
  return cupons
    .filter((c: any) => c.maxUsos == null || c.usos < c.maxUsos)
    .map((c: any) => ({
      id: c.id,
      codigo: c.codigo,
      nome: c.nome,
      tipo: c.tipo,
      valor: Number(c.valor),
      duracaoMeses: c.duracaoMeses,
      descricao: c.descricao,
      destaque: c.destaque,
      validoAte: c.validoAte ? c.validoAte.toISOString() : null,
      apenasPlanos: Array.isArray(c.apenasPlanos) ? c.apenasPlanos : [],
      apenasCiclo: c.apenasCiclo,
    }));
}

/**
 * Valida um cupom para um contexto específico. Retorna estrutura uniforme.
 * `contexto` é opcional — sem ele, valida apenas elegibilidade básica (sem checar empresa/plano/ciclo).
 */
export async function validarCupom(
  codigo: string,
  contexto?: {
    plano?: string;
    ciclo?: 'MONTHLY' | 'YEARLY';
    empresaId?: string;
    valorMensal?: number;
  }
): Promise<ResultadoValidacao> {
  const cupom = await buscarCupom(codigo);
  if (!cupom) return { ok: false, erro: 'NAO_ENCONTRADO', mensagem: ERROS.NAO_ENCONTRADO };

  if (!cupom.ativo) return { ok: false, erro: 'INATIVO', mensagem: ERROS.INATIVO };

  const now = new Date();
  if (cupom.validoDe && new Date(cupom.validoDe) > now) {
    return { ok: false, erro: 'AINDA_NAO_VALIDO', mensagem: ERROS.AINDA_NAO_VALIDO };
  }
  if (cupom.validoAte && new Date(cupom.validoAte) < now) {
    return { ok: false, erro: 'EXPIRADO', mensagem: ERROS.EXPIRADO };
  }
  if (cupom.maxUsos != null && cupom.usos >= cupom.maxUsos) {
    return { ok: false, erro: 'ESGOTADO', mensagem: ERROS.ESGOTADO };
  }

  if (contexto?.plano && cupom.apenasPlanos?.length > 0) {
    if (!cupom.apenasPlanos.includes(contexto.plano)) {
      return { ok: false, erro: 'PLANO_NAO_ELEGIVEL', mensagem: ERROS.PLANO_NAO_ELEGIVEL };
    }
  }

  if (contexto?.ciclo && cupom.apenasCiclo && cupom.apenasCiclo !== contexto.ciclo) {
    return { ok: false, erro: 'CICLO_NAO_ELEGIVEL', mensagem: ERROS.CICLO_NAO_ELEGIVEL };
  }

  if (contexto?.empresaId) {
    const usoExistente = await (prisma as any).cupomUso.findUnique({
      where: { cupomId_empresaId: { cupomId: cupom.id, empresaId: contexto.empresaId } },
    });
    if (usoExistente) {
      return { ok: false, erro: 'JA_USADO', mensagem: ERROS.JA_USADO };
    }
  }

  const cupomPublico: CupomPublico = {
    id: cupom.id,
    codigo: cupom.codigo,
    nome: cupom.nome,
    tipo: cupom.tipo,
    valor: Number(cupom.valor),
    duracaoMeses: cupom.duracaoMeses,
    descricao: cupom.descricao,
    destaque: cupom.destaque,
    validoAte: cupom.validoAte ? cupom.validoAte.toISOString() : null,
    apenasPlanos: Array.isArray(cupom.apenasPlanos) ? cupom.apenasPlanos : [],
    apenasCiclo: cupom.apenasCiclo,
  };

  // Calcula preview se temos valor mensal
  let descontoPreview = null;
  if (contexto?.valorMensal != null) {
    descontoPreview = calcularDesconto(cupomPublico, contexto.valorMensal);
  }

  return { ok: true, cupom: cupomPublico, descontoPreview };
}

/**
 * Calcula o desconto que o cupom aplica sobre um valor mensal.
 * Para MESES_GRATIS, retorna 0 no preview e o "resumoTexto" indica os meses grátis.
 */
export function calcularDesconto(
  cupom: CupomPublico,
  valorMensal: number
): { valorOriginal: number; desconto: number; valorComDesconto: number; resumoTexto: string } {
  const original = Number(valorMensal.toFixed(2));
  let desconto = 0;
  let resumoTexto = '';
  const duracao = cupom.duracaoMeses === -1 ? 'sempre' : `${cupom.duracaoMeses} mês${cupom.duracaoMeses === 1 ? '' : 'es'}`;

  switch (cupom.tipo) {
    case 'PERCENTUAL':
      desconto = Number((original * (cupom.valor / 100)).toFixed(2));
      resumoTexto = `${cupom.valor}% off (${duracao})`;
      break;
    case 'VALOR_FIXO':
      desconto = Math.min(cupom.valor, original);
      resumoTexto = `R$ ${cupom.valor.toFixed(2).replace('.', ',')} off (${duracao})`;
      break;
    case 'MESES_GRATIS':
      desconto = original;
      resumoTexto = `${cupom.valor} ${cupom.valor === 1 ? 'mês grátis' : 'meses grátis'}`;
      break;
    case 'TRIAL_ESTENDIDO':
      desconto = 0;
      resumoTexto = `+${cupom.valor} dias de trial`;
      break;
  }

  return {
    valorOriginal: original,
    desconto,
    valorComDesconto: Number((original - desconto).toFixed(2)),
    resumoTexto,
  };
}

/**
 * Aplica o cupom a uma empresa, criando um CupomUso e incrementando o contador.
 * Idempotente via constraint @@unique([cupomId, empresaId]).
 */
export async function aplicarCupom(cupomId: string, empresaId: string, valorAplicado = 0) {
  const cupom = await (prisma as any).cupom.findUnique({ where: { id: cupomId } });
  if (!cupom) throw new Error('cupom_nao_encontrado');

  const parcelasMax = cupom.duracaoMeses === -1 ? 9999 : cupom.duracaoMeses;

  return prisma.$transaction(async (tx: any) => {
    const uso = await tx.cupomUso.upsert({
      where: { cupomId_empresaId: { cupomId, empresaId } },
      update: {},
      create: {
        cupomId,
        empresaId,
        parcelasAplicadas: 0,
        parcelasMax,
        valorAplicadoTotal: valorAplicado,
      },
    });
    await tx.cupom.update({
      where: { id: cupomId },
      data: { usos: { increment: 1 } },
    });
    return uso;
  });
}
