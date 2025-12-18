import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';
import { compararRostos } from '@/lib/rekognition'; 
import { obterEndereco } from '@/utils/geocoding'; 

// Função Haversine (Mantida localmente para garantir)
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
    // O campo 'tipo' deve vir do botão que o funcionário clicou: 
    // 'ENTRADA', 'SAIDA_INTERVALO', 'VOLTA_INTERVALO', ou 'SAIDA'

    if (!usuarioId || !latitude || !longitude) {
      return NextResponse.json({ erro: 'Dados de GPS inválidos.' }, { status: 400 });
    }

    // 1. Busca Usuário e Configurações
    const usuario = await prisma.usuario.findUnique({ 
        where: { id: usuarioId },
        include: { empresa: true }
    });

    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });

    // === NOVA LÓGICA: VALIDAÇÃO DE SEQUÊNCIA (MÁQUINA DE ESTADOS) ===
    // Isso evita duplicidade e garante a ordem correta dos pontos
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ultimoPonto = await prisma.ponto.findFirst({
        where: {
            usuarioId: usuarioId,
            dataHora: { gte: hoje }
        },
        orderBy: { dataHora: 'desc' }
    });

    // Determina o tipo do último registro (Compatibilidade com Dashboard)
    const ultimoTipo = ultimoPonto ? (ultimoPonto.subTipo || ultimoPonto.tipo) : null;
    const acaoSolicitada = tipo || 'ENTRADA'; // Padrão é entrada se não vier nada

    // Regras de Bloqueio
    if (!ultimoPonto) {
        // Se é o primeiro do dia, TEM que ser ENTRADA
        if (acaoSolicitada !== 'ENTRADA') {
            return NextResponse.json({ erro: 'Seu primeiro registro do dia deve ser uma ENTRADA.' }, { status: 400 });
        }
    } else {
        if (ultimoTipo === 'ENTRADA') {
            if (!['SAIDA_INTERVALO', 'SAIDA'].includes(acaoSolicitada)) {
                return NextResponse.json({ erro: 'Você já registrou a Entrada. Agora inicie o intervalo ou encerre o dia.' }, { status: 409 });
            }
        }
        else if (ultimoTipo === 'SAIDA_INTERVALO') {
            if (acaoSolicitada !== 'VOLTA_INTERVALO') {
                return NextResponse.json({ erro: 'Você está em intervalo. Registre a VOLTA DO INTERVALO.' }, { status: 409 });
            }
        }
        else if (ultimoTipo === 'VOLTA_INTERVALO') {
            if (acaoSolicitada !== 'SAIDA') {
                return NextResponse.json({ erro: 'Você retornou do intervalo. O próximo registro deve ser a SAÍDA.' }, { status: 409 });
            }
        }
        else if (ultimoTipo === 'SAIDA') {
            if (acaoSolicitada !== 'ENTRADA') {
                return NextResponse.json({ erro: 'Jornada anterior encerrada. Inicie uma nova ENTRADA.' }, { status: 409 });
            }
        }
    }
    // ================================================================

    const configs = usuario.empresa?.configuracoes as any || {};
    // Configurações padrão de segurança
    const empresaExigeFoto = configs.exigirFoto !== false; 
    const empresaBloqueiaRaio = configs.bloquearForaDoRaio !== false;

    // 2. Tenta obter endereço legível (Geocoding)
    let enderecoLegivel = "Localização desconhecida";
    try {
        if (typeof obterEndereco === 'function') {
            enderecoLegivel = await obterEndereco(latitude, longitude);
        }
    } catch (err) { console.log("Falha ao obter endereço, salvando apenas GPS"); }

    // === 3. VALIDAÇÃO BIOMÉTRICA E FOTO ===
    let fotoUrl = null;

    if (empresaExigeFoto && !fotoBase64) {
        return NextResponse.json({ erro: 'A foto é obrigatória nesta empresa.' }, { status: 400 });
    }

    if (fotoBase64) {
        // A. Validação Biométrica
        if (usuario.fotoPerfilUrl) {
             try {
                 const resultado = await compararRostos(usuario.fotoPerfilUrl, fotoBase64);
                 if (!resultado.igual) {
                     return NextResponse.json({ 
                         erro: 'Reconhecimento Facial Falhou! Rosto não confere.' 
                     }, { status: 403 });
                 }
             } catch (e) {
                 console.error("Erro na IA:", e);
             }
        }

        // B. Upload da Foto
        try {
            const buffer = Buffer.from(fotoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
            const filename = `ponto-${usuario.id}-${Date.now()}.jpg`;
            const blob = await put(filename, buffer, { access: 'public', contentType: 'image/jpeg' });
            fotoUrl = blob.url;
        } catch (e) {
            console.error("Erro upload:", e);
            return NextResponse.json({ erro: 'Falha ao salvar a foto.' }, { status: 500 });
        }
    }

    // === 4. VALIDAÇÃO GEOFENCE (CERCA VIRTUAL) ===
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

    if (!localValidado) {
        return NextResponse.json({ erro: 'Você está longe do local de trabalho!' }, { status: 400 });
    }

    // === 5. SALVAR NO BANCO ===
    await prisma.ponto.create({
      data: {
        usuarioId,
        dataHora: new Date(),
        latitude,
        longitude,
        fotoUrl, 
        // IMPORTANTE: Salvamos como 'PONTO' genérico e usamos o subTipo para especificar
        // Isso garante que o Dashboard funcione corretamente com a lógica de cálculo.
        tipo: 'PONTO', 
        subTipo: acaoSolicitada, // ENTRADA, SAIDA_INTERVALO, VOLTA_INTERVALO, SAIDA
        endereco: enderecoLegivel !== "Localização desconhecida" ? enderecoLegivel : nomeLocal
      }
    });

    return NextResponse.json({ success: true, mensagem: `${acaoSolicitada} registrada em ${nomeLocal}` });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro interno no servidor.' }, { status: 500 });
  }
}