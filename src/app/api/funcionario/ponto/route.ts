import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';
import { compararRostos } from '@/lib/rekognition'; 
import { obterEndereco } from '@/utils/geocoding'; 

const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuarioId, latitude, longitude, fotoBase64, tipo } = body; 

    if (!usuarioId || !latitude || !longitude) {
      return NextResponse.json({ erro: 'Dados de GPS inválidos.' }, { status: 400 });
    }

    // 1. Busca Usuário
    const usuario = await prisma.usuario.findUnique({ 
        where: { id: usuarioId },
        include: { empresa: true }
    });

    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });

    const fluxoEstrito = usuario.empresa?.fluxoEstrito !== false; 

    // === BUSCA O ÚLTIMO PONTO ===
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ultimoPonto = await prisma.ponto.findFirst({
        where: { usuarioId: usuarioId, dataHora: { gte: hoje } },
        orderBy: { dataHora: 'desc' }
    });

    // === TRAVA DE SEGURANÇA (NOVA) ===
    // Se existir um ponto hoje, verifica há quanto tempo ele foi criado.
    if (ultimoPonto) {
        const agora = new Date();
        const tempoPassado = agora.getTime() - new Date(ultimoPonto.dataHora).getTime();
        const segundos = tempoPassado / 1000;

        // Se faz menos de 60 segundos que bateu o último ponto, bloqueia.
        if (segundos < 60) {
            return NextResponse.json({ 
                erro: 'Ponto já registrado! Aguarde 1 minuto para registrar novamente.' 
            }, { status: 429 }); // 429 = Too Many Requests
        }
    }

    // === VALIDAÇÃO DE FLUXO (LÓGICA FLEXÍVEL) ===
    if (fluxoEstrito) {
        const ultimoTipo = ultimoPonto ? (ultimoPonto.tipo || ultimoPonto.subTipo || '') : '';
        const acaoSolicitada = tipo || 'ENTRADA'; 

        // Cenário 1: Primeiro ponto do dia
        if (!ultimoPonto) {
            if (acaoSolicitada !== 'ENTRADA') {
                return NextResponse.json({ erro: 'Seu dia deve começar com uma ENTRADA.' }, { status: 400 });
            }
        } 
        else {
            const estaTrabalhando = ['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(ultimoTipo);
            
            const estaNoAlmoco = ultimoTipo === 'SAIDA_ALMOCO';
            const estaNoCafe = ultimoTipo === 'SAIDA_INTERVALO'; 
            const diaEncerrado = ultimoTipo === 'SAIDA';

            if (diaEncerrado) {
                 if (acaoSolicitada !== 'ENTRADA') return NextResponse.json({ erro: 'Dia encerrado. Inicie uma nova ENTRADA.' }, { status: 409 });
            }
            
            else if (estaTrabalhando) {
                const acoesPermitidas = ['SAIDA_ALMOCO', 'SAIDA_INTERVALO', 'SAIDA'];
                if (!acoesPermitidas.includes(acaoSolicitada)) {
                    return NextResponse.json({ erro: 'Você já está trabalhando. Escolha uma pausa ou encerre o dia.' }, { status: 409 });
                }
            }

            else if (estaNoAlmoco) {
                if (acaoSolicitada !== 'VOLTA_ALMOCO') {
                    return NextResponse.json({ erro: 'Você está em horário de ALMOÇO. Registre a VOLTA DO ALMOÇO.' }, { status: 409 });
                }
            }

            else if (estaNoCafe) {
                if (acaoSolicitada !== 'VOLTA_INTERVALO') {
                    return NextResponse.json({ erro: 'Você está no intervalo de CAFÉ. Registre a VOLTA DO INTERVALO.' }, { status: 409 });
                }
            }
        }
    }

    // === CONFIGURAÇÕES GERAIS ===
    const configs = usuario.empresa?.configuracoes as any || {};
    const empresaExigeFoto = configs.exigirFoto !== false; 
    const empresaBloqueiaRaio = configs.bloquearForaDoRaio !== false;

    // Endereço
    let enderecoLegivel = "Localização desconhecida";
    try {
        if (typeof obterEndereco === 'function') {
            enderecoLegivel = await obterEndereco(latitude, longitude);
        }
    } catch (err) { console.log("Erro endereço"); }

    // Foto
    let fotoUrl = null;

    if (empresaExigeFoto && !fotoBase64) return NextResponse.json({ erro: 'A foto é obrigatória.' }, { status: 400 });

    if (fotoBase64) {
        if (usuario.fotoPerfilUrl) {
             try {
                 const resultado = await compararRostos(usuario.fotoPerfilUrl, fotoBase64);
                 if (!resultado.igual) return NextResponse.json({ erro: 'Reconhecimento Facial Falhou! Rosto não confere.' }, { status: 403 });
             } catch (e) { console.error("Erro IA", e); }
        }
        try {
            const buffer = Buffer.from(fotoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
            const filename = `ponto-${usuario.id}-${Date.now()}.jpg`;
            const blob = await put(filename, buffer, { access: 'public', contentType: 'image/jpeg' });
            fotoUrl = blob.url;
        } catch (e) { return NextResponse.json({ erro: 'Erro ao salvar foto.' }, { status: 500 }); }
    }

    // Validação Raio
    let localValidado = false;
    let nomeLocal = 'Desconhecido';

    if (usuario.pontoLivre || !empresaBloqueiaRaio) {
        localValidado = true;
        nomeLocal = usuario.pontoLivre ? 'Externo (Livre)' : 'Fora do Perímetro (Permitido)';
    }

    if (!localValidado) {
        const distSede = getDistanceFromLatLonInMeters(latitude, longitude, usuario.latitudeBase, usuario.longitudeBase);
        if (distSede <= (usuario.raioPermitido || 100)) { 
            localValidado = true; 
            nomeLocal = 'Sede / Principal'; 
        }
    }

    if (!localValidado && usuario.locaisAdicionais) {
        const extras = Array.isArray(usuario.locaisAdicionais) ? usuario.locaisAdicionais : [];
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

    if (!localValidado) return NextResponse.json({ erro: 'Você está fora do local de trabalho permitido!' }, { status: 400 });

    // Salva
    const tipoFinal = tipo || 'ENTRADA';

    await prisma.ponto.create({
      data: {
        usuarioId,
        dataHora: new Date(),
        latitude,
        longitude,
        fotoUrl, 
        tipo: tipoFinal, 
        subTipo: tipoFinal,
        endereco: enderecoLegivel !== "Localização desconhecida" ? enderecoLegivel : nomeLocal
      }
    });

    return NextResponse.json({ success: true, mensagem: 'Ponto registrado com sucesso!' });

  } catch (error) {
    console.error("Erro:", error);
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 });
  }
}