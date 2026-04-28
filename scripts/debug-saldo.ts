/**
 * Compara o cálculo de saldo entre os 3 endpoints para um funcionário/período.
 * Uso: npx tsx scripts/debug-saldo.ts <userId> <inicio> <fim>
 * Ex:  npx tsx scripts/debug-saldo.ts cmmjgz10o002rpsrpm8xr96t2 2026-04-01 2026-04-23
 */
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import { calcularEstatisticas } from '../src/lib/admin/calcularEstatisticas';

const PARCIAL_MARK = '__PARCIAL__:';
function isValidTimeHHMM(v: any) {
  return typeof v === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}
function parseParcial(nome: string) {
  if (!nome) return null;
  const idx = nome.indexOf(PARCIAL_MARK);
  if (idx === -1) return null;
  const rest = nome.slice(idx + PARCIAL_MARK.length).trim();
  const [h1, h2] = rest.split('-').map(s => (s || '').trim());
  if (isValidTimeHHMM(h1) && isValidTimeHHMM(h2)) return { inicio: h1, fim: h2 };
  return null;
}

async function main() {
  const [, , userId, inicio, fim] = process.argv;
  if (!userId || !inicio || !fim) {
    console.error('Uso: npx tsx scripts/debug-saldo.ts <userId> <YYYY-MM-DD> <YYYY-MM-DD>');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { id: true, nome: true, empresaId: true, jornada: true, criadoEm: true },
  });
  if (!user) { console.error('Usuário não encontrado'); process.exit(1); }
  console.log('\n=== FUNCIONÁRIO ===');
  console.log('nome:', user.nome);
  console.log('criadoEm:', user.criadoEm.toISOString());

  if (!user.empresaId) { console.error('Usuário sem empresa'); process.exit(1); }
  const empresa = await prisma.empresa.findUnique({
    where: { id: user.empresaId },
    select: { configuracoes: true },
  });
  const tolCfg = (empresa?.configuracoes as any)?.toleranciaMinutos;
  const toleranciaMinutos = typeof tolCfg === 'number' ? tolCfg : 10;
  console.log('toleranciaMinutos:', toleranciaMinutos);

  const dataInicioDate = new Date(`${inicio}T00:00:00`);
  const dataFimDate = new Date(`${fim}T23:59:59.999`);

  // Range estendido (como os dois endpoints usam, pra detectar sábado trabalhado)
  const rangeExpandido = new Date(dataInicioDate);
  rangeExpandido.setDate(rangeExpandido.getDate() - 7);

  // === QUERIES IGUAIS AS DO RELATÓRIO MENSAL ===
  const pontosRel = await prisma.ponto.findMany({
    where: { usuarioId: userId, dataHora: { gte: rangeExpandido, lte: dataFimDate } },
    select: { id: true, dataHora: true, tipo: true, subTipo: true, usuarioId: true },
    orderBy: { dataHora: 'asc' },
  });
  const ausenciasRel = await prisma.ausencia.findMany({
    where: {
      usuarioId: userId,
      status: { in: ['APROVADO', 'APROVADA'] },
      dataInicio: { lte: dataFimDate },
      dataFim: { gte: dataInicioDate },
    },
  });
  const feriadosRel = await prisma.feriado.findMany({
    where: {
      OR: [{ empresaId: user.empresaId }, { empresaId: null }],
      data: { gte: dataInicioDate, lte: dataFimDate },
    },
  });
  const heRel = await prisma.horaExtra.findMany({
    where: { usuarioId: userId, status: 'APROVADO', data: { gte: inicio, lte: fim } },
    select: { usuarioId: true, data: true, minutosExtra: true },
  });
  const ajustesRel = await prisma.ajusteBancoHoras.findMany({
    where: {
      usuarioId: userId,
      OR: [
        { data: { gte: inicio, lte: fim } },
        { dataFolga: { gte: inicio, lte: fim } },
      ],
    },
    select: { usuarioId: true, data: true, dataFolga: true, minutos: true, tipo: true },
  });

  console.log('\n=== DADOS BRUTOS ===');
  console.log('pontos:', pontosRel.length, ' (expandido 7 dias antes)');
  console.log('ausências:', ausenciasRel.length);
  console.log('feriados:', feriadosRel.length, feriadosRel.map(f => `${format(f.data, 'yyyy-MM-dd')} ${f.nome}`));
  console.log('horas extras aprovadas:', heRel.length);
  console.log('ajustes banco:', ajustesRel.length);
  ajustesRel.forEach(a => console.log('  -', a.data, a.tipo, a.minutos, 'min', 'dataFolga:', a.dataFolga));

  // Feriados separados integrais/parciais
  const feriadosIntegrais: string[] = [];
  const feriadosParciais: Record<string, { inicio: string; fim: string }> = {};
  feriadosRel.forEach(f => {
    const dia = format(f.data, 'yyyy-MM-dd');
    const p = parseParcial(f.nome || '');
    if (p) feriadosParciais[dia] = p;
    else feriadosIntegrais.push(dia);
  });
  console.log('feriados integrais:', feriadosIntegrais);
  console.log('feriados parciais:', feriadosParciais);

  const registros = [
    ...pontosRel.map(p => ({
      id: p.id, dataHora: p.dataHora, tipo: 'PONTO', subTipo: p.tipo,
      descricao: null, usuario: { id: p.usuarioId, nome: '' }, extra: {},
    })),
    ...ausenciasRel.map(a => ({
      id: a.id, dataHora: a.dataInicio, tipo: 'AUSENCIA', subTipo: a.tipo,
      descricao: null, usuario: { id: a.usuarioId, nome: '' }, extra: { dataFim: a.dataFim },
    })),
  ];

  const stats = calcularEstatisticas({
    filtroUsuario: userId,
    registros,
    usuarios: [user],
    feriados: feriadosIntegrais,
    feriadosParciais,
    dataInicio: inicio,
    dataFim: fim,
    horasExtrasAprovadas: heRel,
    ajustesBanco: ajustesRel.map(a => ({ ...a, dataFolga: a.dataFolga ?? undefined })),
    toleranciaMinutos,
  });

  console.log('\n=== RESULTADO calcularEstatisticas ===');
  console.log('total trabalhado:', stats?.total, '(', stats?.totalMinutos, 'min)');
  console.log('saldo:', stats?.saldo, '(', stats?.saldoMinutos, 'min)');
  console.log('saldoPositivo:', stats?.saldoPositivo);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
