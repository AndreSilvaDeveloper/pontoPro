import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { storagePut } from '@/lib/storage';
import { buscarRostoNaColecao } from '@/lib/rekognition';

export const runtime = 'nodejs';

/**
 * Determina o próximo tipo de ponto baseado no histórico do dia.
 * - intervaloPago=true: ENTRADA → SAIDA (2 batidas, café ignorado)
 * - intervaloPago=false + permiteCafe=false: ENTRADA → SAIDA_ALMOCO → VOLTA_ALMOCO → SAIDA (4 batidas)
 * - intervaloPago=false + permiteCafe=true + cafeDepoisDoAlmoco=false:
 *   ENTRADA → SAIDA_INTERVALO → VOLTA_INTERVALO → SAIDA_ALMOCO → VOLTA_ALMOCO → SAIDA
 * - intervaloPago=false + permiteCafe=true + cafeDepoisDoAlmoco=true:
 *   ENTRADA → SAIDA_ALMOCO → VOLTA_ALMOCO → SAIDA_INTERVALO → VOLTA_INTERVALO → SAIDA
 */
function proximoTipoPonto(
  pontosHoje: { tipo: string; subTipo: string | null }[],
  intervaloPago: boolean,
  permiteCafe: boolean,
  cafeDepoisDoAlmoco: boolean,
): string | null {
  if (pontosHoje.length === 0) return 'ENTRADA';

  const ultimo = pontosHoje[pontosHoje.length - 1];
  const tipo = ultimo.subTipo || ultimo.tipo;

  if (intervaloPago) {
    if (['ENTRADA', 'PONTO'].includes(tipo)) return 'SAIDA';
    return null;
  }

  // Estados "no meio" do intervalo — sempre fecham o que abriu
  if (tipo === 'SAIDA_INTERVALO') return 'VOLTA_INTERVALO';
  if (tipo === 'SAIDA_ALMOCO') return 'VOLTA_ALMOCO';
  if (tipo === 'SAIDA') return null;

  // Estado "trabalhando" (ENTRADA, VOLTA_INTERVALO ou VOLTA_ALMOCO)
  const jaCafeou = pontosHoje.some(p => (p.subTipo || p.tipo) === 'SAIDA_INTERVALO');
  const jaAlmocou = pontosHoje.some(p => (p.subTipo || p.tipo) === 'SAIDA_ALMOCO');

  if (permiteCafe && cafeDepoisDoAlmoco) {
    // Almoço primeiro, depois café
    if (!jaAlmocou) return 'SAIDA_ALMOCO';
    if (!jaCafeou) return 'SAIDA_INTERVALO';
    return 'SAIDA';
  }

  // Café primeiro (default), depois almoço
  if (permiteCafe && !jaCafeou) return 'SAIDA_INTERVALO';
  if (!jaAlmocou) return 'SAIDA_ALMOCO';
  return 'SAIDA';
}

/**
 * POST: tablet em modo totem identifica + bate ponto.
 * Headers: Authorization: Bearer <token>
 * Body: { fotoBase64: "data:image/jpeg;base64,..." }
 */
export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) {
      return NextResponse.json({ erro: 'token_ausente' }, { status: 401 });
    }

    const totem = await prisma.totemDevice.findUnique({
      where: { token },
      include: {
        empresa: {
          select: { id: true, status: true, intervaloPago: true, addonTotem: true, matrizId: true, nome: true, configuracoes: true },
        },
      },
    });

    if (!totem || !totem.ativo) {
      return NextResponse.json({ erro: 'totem_invalido' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const fotoBase64 = String(body?.fotoBase64 || '');
    const dataHoraOffline = body?.dataHoraOffline ? String(body.dataHoraOffline) : null;
    const isSyncOffline = !!dataHoraOffline;

    // Throttle: rejeita batidas do mesmo totem em janela <2s — evita abuso/duplicidade e custo AWS.
    // Não aplica em sync offline (lote drenando fila tem que processar todos rapidamente).
    if (!isSyncOffline && totem.ultimoUso && Date.now() - totem.ultimoUso.getTime() < 2000) {
      return NextResponse.json({ erro: 'aguarde', mensagem: 'Aguarde um instante antes de bater de novo.' }, { status: 429 });
    }

    if (totem.empresa.status === 'BLOQUEADO') {
      return NextResponse.json({
        erro: 'empresa_bloqueada',
        mensagem: 'Acesso bloqueado. Fale com o administrador da empresa.',
      }, { status: 403 });
    }

    let temAddon = totem.empresa.addonTotem === true;
    if (!temAddon && totem.empresa.matrizId) {
      const matriz = await prisma.empresa.findUnique({
        where: { id: totem.empresa.matrizId },
        select: { addonTotem: true },
      });
      temAddon = matriz?.addonTotem === true;
    }
    if (!temAddon) {
      return NextResponse.json({ erro: 'addon_inativo' }, { status: 402 });
    }

    if (!fotoBase64) {
      return NextResponse.json({ erro: 'foto_obrigatoria' }, { status: 400 });
    }

    // Anti-abuso: rejeita timestamps offline absurdamente antigos (>30 dias) ou no futuro.
    const refDate = dataHoraOffline ? new Date(dataHoraOffline) : new Date();
    if (isSyncOffline) {
      const agora = Date.now();
      const t = refDate.getTime();
      if (Number.isNaN(t) || t > agora + 60_000 || t < agora - 30 * 24 * 60 * 60 * 1000) {
        return NextResponse.json({ erro: 'data_invalida' }, { status: 400 });
      }
    }

    // 1) Identificar funcionário pelo rosto (1:N)
    const match = await buscarRostoNaColecao({
      empresaId: totem.empresaId,
      fotoBase64,
    });

    if (!match.usuarioId) {
      return NextResponse.json({
        erro: 'nao_identificado',
        mensagem: 'Não consegui te identificar. Posicione melhor o rosto e tente de novo.',
      }, { status: 404 });
    }

    // 2) Validar que o usuário pertence à empresa do totem (segurança extra)
    const usuario = await prisma.usuario.findUnique({
      where: { id: match.usuarioId },
      select: { id: true, nome: true, empresaId: true, jornada: true },
    });
    if (!usuario || usuario.empresaId !== totem.empresaId) {
      return NextResponse.json({
        erro: 'usuario_nao_pertence_empresa',
        mensagem: 'Funcionário não encontrado nessa empresa.',
      }, { status: 403 });
    }

    // 3) Determinar tipo do ponto baseado no histórico do dia
    // Quando é sync offline, usa o dia da batida original — não o dia atual.
    const inicioDia = new Date(refDate);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(refDate);
    fimDia.setHours(23, 59, 59, 999);

    const pontosHoje = await prisma.ponto.findMany({
      where: { usuarioId: usuario.id, dataHora: { gte: inicioDia, lte: fimDia } },
      orderBy: { dataHora: 'asc' },
      select: { tipo: true, subTipo: true },
    });

    const cfg = (totem.empresa.configuracoes as { permiteIntervaloCafe?: boolean; cafeDepoisDoAlmoco?: boolean } | null) || {};
    const permiteCafe = cfg.permiteIntervaloCafe === true;
    // Resolve ordem do café: override por funcionário (jornada.cafeOrdem) tem prioridade sobre o padrão da empresa.
    const overrideOrdem = (usuario.jornada as { cafeOrdem?: string } | null)?.cafeOrdem;
    const cafeDepoisDoAlmoco = overrideOrdem === 'DEPOIS' ? true
      : overrideOrdem === 'ANTES' ? false
      : cfg.cafeDepoisDoAlmoco === true;
    const tipoFinal = proximoTipoPonto(pontosHoje, totem.empresa.intervaloPago, permiteCafe, cafeDepoisDoAlmoco);
    if (!tipoFinal) {
      return NextResponse.json({
        erro: 'jornada_encerrada',
        mensagem: `${usuario.nome.split(' ')[0]}, você já encerrou o expediente hoje.`,
        usuarioNome: usuario.nome,
      }, { status: 409 });
    }

    // 4) Salvar foto da batida (evidência)
    let fotoUrl: string | null = null;
    try {
      const buffer = Buffer.from(fotoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const filename = `totem-${usuario.id}-${Date.now()}.jpg`;
      const blob = await storagePut(filename, buffer, { access: 'public', contentType: 'image/jpeg', permanente: true });
      fotoUrl = blob.url;
    } catch (e) {
      console.error('[totem/bater] falha ao salvar foto:', e);
    }

    // 5) Criar registro do ponto
    // Se é sync offline, usa o timestamp original da batida; senão, agora.
    const agora = isSyncOffline ? refDate : new Date();
    await prisma.ponto.create({
      data: {
        usuarioId: usuario.id,
        dataHora: agora,
        latitude: 0,
        longitude: 0,
        endereco: `Totem: ${totem.nome}${isSyncOffline ? ' (offline)' : ''}`,
        fotoUrl,
        tipo: tipoFinal,
        subTipo: tipoFinal,
        origem: 'TOTEM',
        totemId: totem.id,
      },
    });

    // Atualiza ultimoUso do totem só em batidas ao vivo — offline sync não conta como heartbeat.
    if (!isSyncOffline) {
      prisma.totemDevice.update({
        where: { id: totem.id },
        data: { ultimoUso: agora },
      }).catch(() => {});
    }

    const tipoLabels: Record<string, string> = {
      ENTRADA: 'Entrada',
      SAIDA_ALMOCO: 'Saída para almoço',
      VOLTA_ALMOCO: 'Volta do almoço',
      SAIDA_INTERVALO: 'Saída para intervalo',
      VOLTA_INTERVALO: 'Volta do intervalo',
      SAIDA: 'Saída',
    };

    return NextResponse.json({
      ok: true,
      usuarioNome: usuario.nome,
      tipo: tipoFinal,
      tipoLabel: tipoLabels[tipoFinal] ?? tipoFinal,
      horario: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
      confianca: match.confianca,
    });
  } catch (err) {
    console.error('[totem/bater-ponto] erro:', err);
    return NextResponse.json({ erro: 'erro_interno' }, { status: 500 });
  }
}
