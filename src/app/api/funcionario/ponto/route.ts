import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';
import { compararRostos } from '@/lib/rekognition';
import { obterEndereco } from '@/utils/geocoding';

const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function normalizeIp(raw: string) {
  let ip = raw.trim();

  // remove porta se vier "ip:porta"
  if (ip.includes(':') && !ip.includes('::') && ip.split(':').length === 2) {
    ip = ip.split(':')[0].trim();
  }

  // IPv6 mapeado "::ffff:1.2.3.4"
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '').trim();

  // remove aspas do forwarded
  ip = ip.replace(/^"+|"+$/g, '');

  return ip;
}

function extractClientIp(headers: Headers) {
  const cf = headers.get('cf-connecting-ip');
  if (cf && cf.trim()) return normalizeIp(cf);

  const xReal = headers.get('x-real-ip');
  if (xReal && xReal.trim()) return normalizeIp(xReal);

  const xff = headers.get('x-forwarded-for');
  if (xff && xff.trim()) {
    const first = xff.split(',')[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const forwarded = headers.get('forwarded');
  if (forwarded && forwarded.includes('for=')) {
    const match = forwarded.match(/for="?([^;,"\s]+)"?/i);
    if (match?.[1]) return normalizeIp(match[1]);
  }

  return null;
}

function parseAllowedIps(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);

  const s = String(value);
  return s
    .split(/[\s,;]+/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

type ModoValidacao = 'GPS' | 'PC_IP' | 'GPS_E_IP';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuarioId, latitude, longitude, fotoBase64, tipo } = body;

    if (!usuarioId) {
      return NextResponse.json({ erro: 'Usuário inválido.' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { empresa: true },
    });

    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });

    const fluxoEstrito = usuario.empresa?.fluxoEstrito !== false;

    const modoValidacao = (usuario as any).modoValidacaoPonto as ModoValidacao | null;
    const modo: ModoValidacao = modoValidacao || 'GPS';

    // === VALIDAÇÃO POR IP (se habilitada) ===
    if (modo === 'PC_IP' || modo === 'GPS_E_IP') {
      const ip = extractClientIp(request.headers);
      const allowed = parseAllowedIps((usuario as any).ipsPermitidos);

      // Se empresa escolheu validar por IP, mas não cadastrou nada:
      if (!allowed.length) {
        return NextResponse.json(
          { erro: 'Validação por IP ativa, mas não há IPs permitidos cadastrados para este funcionário.' },
          { status: 403 }
        );
      }

      // Tenta validar o IP capturado ou faz fallback para localhost se necessário
      let ipAutorizado = false;
      
      if (ip && allowed.includes(ip)) {
          ipAutorizado = true;
      } else {
          // Fallback especial para localhost/desenvolvimento
          const isLocalhostRequest = ip === '::1' || ip === '127.0.0.1' || !ip;
          const hasLocalhostAllowed = allowed.some(x => x === '::1' || x === '127.0.0.1');
          
          if (isLocalhostRequest && hasLocalhostAllowed) {
              ipAutorizado = true;
          }
      }

      if (!ipAutorizado) {
        return NextResponse.json(
          { erro: `IP não autorizado (${ip || 'Indetectável'}). Procure o administrador.` },
          { status: 403 }
        );
      }
    }

    // === VALIDAÇÃO GPS (se habilitada) ===
    const gpsObrigatorio = modo === 'GPS' || modo === 'GPS_E_IP';

    if (gpsObrigatorio) {
      if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
        return NextResponse.json({ erro: 'Dados de GPS inválidos.' }, { status: 400 });
      }
    }

    // === BUSCA O ÚLTIMO PONTO ===
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ultimoPonto = await prisma.ponto.findFirst({
      where: { usuarioId: usuarioId, dataHora: { gte: hoje } },
      orderBy: { dataHora: 'desc' },
    });

    // === TRAVA DE SEGURANÇA ===
    if (ultimoPonto) {
      const agora = new Date();
      const tempoPassado = agora.getTime() - new Date(ultimoPonto.dataHora).getTime();
      const segundos = tempoPassado / 1000;

      if (segundos < 60) {
        return NextResponse.json(
          { erro: 'Ponto já registrado! Aguarde 1 minuto para registrar novamente.' },
          { status: 429 }
        );
      }
    }

    // === VALIDAÇÃO DE FLUXO ===
    if (fluxoEstrito) {
      const ultimoTipo = ultimoPonto ? (ultimoPonto.tipo || ultimoPonto.subTipo || '') : '';
      const acaoSolicitada = tipo || 'ENTRADA';

      if (!ultimoPonto) {
        if (acaoSolicitada !== 'ENTRADA') {
          return NextResponse.json({ erro: 'Seu dia deve começar com uma ENTRADA.' }, { status: 400 });
        }
      } else {
        const estaTrabalhando = ['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(ultimoTipo);

        const estaNoAlmoco = ultimoTipo === 'SAIDA_ALMOCO';
        const estaNoCafe = ultimoTipo === 'SAIDA_INTERVALO';
        const diaEncerrado = ultimoTipo === 'SAIDA';

        if (diaEncerrado) {
          if (acaoSolicitada !== 'ENTRADA')
            return NextResponse.json({ erro: 'Dia encerrado. Inicie uma nova ENTRADA.' }, { status: 409 });
        } else if (estaTrabalhando) {
          const acoesPermitidas = ['SAIDA_ALMOCO', 'SAIDA_INTERVALO', 'SAIDA'];
          if (!acoesPermitidas.includes(acaoSolicitada)) {
            return NextResponse.json(
              { erro: 'Você já está trabalhando. Escolha uma pausa ou encerre o dia.' },
              { status: 409 }
            );
          }
        } else if (estaNoAlmoco) {
          if (acaoSolicitada !== 'VOLTA_ALMOCO') {
            return NextResponse.json(
              { erro: 'Você está em horário de ALMOÇO. Registre a VOLTA DO ALMOÇO.' },
              { status: 409 }
            );
          }
        } else if (estaNoCafe) {
          if (acaoSolicitada !== 'VOLTA_INTERVALO') {
            return NextResponse.json(
              { erro: 'Você está no intervalo de CAFÉ. Registre a VOLTA DO INTERVALO.' },
              { status: 409 }
            );
          }
        }
      }
    }

    // === CONFIGURAÇÕES GERAIS ===
    const configs = (usuario.empresa?.configuracoes as any) || {};
    const empresaExigeFoto = configs.exigirFoto !== false;
    const empresaBloqueiaRaio = configs.bloquearForaDoRaio !== false;

    // Endereço (só tenta se tiver GPS)
    let enderecoLegivel = 'Localização desconhecida';
    if (gpsObrigatorio && latitude && longitude) {
      try {
        if (typeof obterEndereco === 'function') {
          enderecoLegivel = await obterEndereco(latitude, longitude);
        }
      } catch (err) {
        console.log('Erro endereço');
      }
    }

    // Foto
    let fotoUrl = null;

    if (empresaExigeFoto && !fotoBase64) {
      return NextResponse.json({ erro: 'A foto é obrigatória.' }, { status: 400 });
    }

    if (fotoBase64) {
      if (usuario.fotoPerfilUrl) {
        try {
          const resultado = await compararRostos(usuario.fotoPerfilUrl, fotoBase64);
          if (!resultado.igual)
            return NextResponse.json({ erro: 'Reconhecimento Facial Falhou! Rosto não confere.' }, { status: 403 });
        } catch (e) {
          console.error('Erro IA', e);
        }
      }

      try {
        const buffer = Buffer.from(fotoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const filename = `ponto-${usuario.id}-${Date.now()}.jpg`;
        const blob = await put(filename, buffer, { access: 'public', contentType: 'image/jpeg' });
        fotoUrl = blob.url;
      } catch (e) {
        return NextResponse.json({ erro: 'Erro ao salvar foto.' }, { status: 500 });
      }
    }

    // === VALIDAÇÃO DE RAIO (só se GPS estiver ativo) ===
    let localValidado = false;
    let nomeLocal = 'Desconhecido';

    if (!gpsObrigatorio) {
      // se não exige GPS, considera validado pelo IP
      localValidado = true;
      nomeLocal = 'Validação por IP';
    } else {
      if (usuario.pontoLivre || !empresaBloqueiaRaio) {
        localValidado = true;
        nomeLocal = usuario.pontoLivre ? 'Externo (Livre)' : 'Fora do Perímetro (Permitido)';
      }

      if (!localValidado && latitude && longitude) {
        const distSede = getDistanceFromLatLonInMeters(
          latitude,
          longitude,
          (usuario as any).latitudeBase,
          (usuario as any).longitudeBase
        );
        if (distSede <= ((usuario as any).raioPermitido || 100)) {
          localValidado = true;
          nomeLocal = 'Sede / Principal';
        }
      }

      if (!localValidado && (usuario as any).locaisAdicionais && latitude && longitude) {
        const extras = Array.isArray((usuario as any).locaisAdicionais) ? (usuario as any).locaisAdicionais : [];
        for (const loc of extras as any[]) {
          if (loc && loc.lat && loc.lng) {
            const dist = getDistanceFromLatLonInMeters(latitude, longitude, Number(loc.lat), Number(loc.lng));
            if (dist <= (Number(loc.raio) || 100)) {
              localValidado = true;
              nomeLocal = loc.nome || 'Local Adicional';
              break;
            }
          }
        }
      }

      if (!localValidado) {
        return NextResponse.json({ erro: 'Você está fora do local de trabalho permitido!' }, { status: 400 });
      }
    }

    const tipoFinal = tipo || 'ENTRADA';

    // === CORREÇÃO CRÍTICA: Definir 0 se for nulo ===
    // O banco não aceita null, então usamos 0 quando estamos validando apenas por IP
    const latSalvar = (gpsObrigatorio && latitude) ? Number(latitude) : 0;
    const lngSalvar = (gpsObrigatorio && longitude) ? Number(longitude) : 0;

    await prisma.ponto.create({
      data: {
        usuarioId,
        dataHora: new Date(),
        latitude: latSalvar,
        longitude: lngSalvar,
        fotoUrl,
        tipo: tipoFinal,
        subTipo: tipoFinal,
        endereco:
          !gpsObrigatorio
            ? 'Validação por IP'
            : enderecoLegivel !== 'Localização desconhecida'
              ? enderecoLegivel
              : nomeLocal,
      },
    });

    return NextResponse.json({ success: true, mensagem: 'Ponto registrado com sucesso!' });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 });
  }
}