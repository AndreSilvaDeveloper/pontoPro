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

    if (!usuarioId || !latitude || !longitude) {
      return NextResponse.json({ erro: 'Dados de GPS inválidos.' }, { status: 400 });
    }

    // 1. Busca Usuário e Configurações
    const usuario = await prisma.usuario.findUnique({ 
        where: { id: usuarioId },
        include: { empresa: true }
    });

    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });

    const configs = usuario.empresa?.configuracoes as any || {};
    // Configurações padrão de segurança
    const empresaExigeFoto = configs.exigirFoto !== false; 
    const empresaBloqueiaRaio = configs.bloquearForaDoRaio !== false;

    // 2. Tenta obter endereço legível (Geocoding)
    let enderecoLegivel = "Localização desconhecida";
    try {
        // Se a função obterEndereco não existir ou der erro, não quebra o fluxo
        if (typeof obterEndereco === 'function') {
            enderecoLegivel = await obterEndereco(latitude, longitude);
        }
    } catch (err) { console.log("Falha ao obter endereço, salvando apenas GPS"); }

    // === 3. VALIDAÇÃO BIOMÉTRICA E FOTO ===
    let fotoUrl = null;

    // Se exige foto e não mandou
    if (empresaExigeFoto && !fotoBase64) {
        return NextResponse.json({ erro: 'A foto é obrigatória nesta empresa.' }, { status: 400 });
    }

    if (fotoBase64) {
        // A. Validação Biométrica (Se tiver foto perfil cadastrada)
        if (usuario.fotoPerfilUrl) {
             try {
                 // Chama sua função de IA
                 const resultado = await compararRostos(usuario.fotoPerfilUrl, fotoBase64);
                 if (!resultado.igual) {
                     return NextResponse.json({ 
                         erro: 'Reconhecimento Facial Falhou! Rosto não confere.' 
                     }, { status: 403 });
                 }
             } catch (e) {
                 console.error("Erro na IA:", e);
                 // Opcional: Bloquear ou deixar passar com aviso se a IA cair
                 // return NextResponse.json({ erro: 'Erro ao validar rosto.' }, { status: 500 });
             }
        }

        // B. Upload da Foto do Ponto
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

    // Ponto Livre ou Empresa Permissiva
    if (usuario.pontoLivre || !empresaBloqueiaRaio) {
        localValidado = true;
        nomeLocal = usuario.pontoLivre ? 'Externo (Livre)' : 'Fora do Perímetro (Permitido)';
    }

    // Verifica Sede
    if (!localValidado) {
        const distSede = getDistanceFromLatLonInMeters(latitude, longitude, usuario.latitudeBase, usuario.longitudeBase);
        if (distSede <= (usuario.raioPermitido || 100)) {
            localValidado = true;
            nomeLocal = 'Sede / Principal';
        }
    }

    // Verifica Locais Adicionais
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
        tipo: tipo || 'ENTRADA',
        endereco: enderecoLegivel !== "Localização desconhecida" ? enderecoLegivel : nomeLocal
      }
    });

    return NextResponse.json({ success: true, mensagem: `Ponto registrado: ${nomeLocal}` });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro interno no servidor.' }, { status: 500 });
  }
}