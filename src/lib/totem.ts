import { prisma } from './db';
import { indexarRosto, removerRosto } from './rekognition';

/**
 * Atualiza o índice facial de um usuário na coleção AWS Rekognition da empresa.
 * Idempotente — pode chamar sempre que a foto mudar.
 *
 * - Se a empresa NÃO tem `addonTotem` ativo, é no-op (não desperdiça chamada AWS).
 * - Se já tinha faceId, remove primeiro.
 * - Indexa a nova foto e salva o faceId no Usuario.
 *
 * Falhas são logadas, não lançadas — não bloquear cadastro/atualização do funcionário.
 */
export async function reindexarRostoUsuario(usuarioId: string): Promise<void> {
  try {
    const u = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        empresaId: true,
        fotoPerfilUrl: true,
        rekognitionFaceId: true,
      },
    });

    if (!u || !u.empresaId) return;

    const empresa = await prisma.empresa.findUnique({
      where: { id: u.empresaId },
      select: { addonTotem: true, matrizId: true },
    });

    // Empresa filial usa o addon da matriz
    let temAddon = empresa?.addonTotem === true;
    if (!temAddon && empresa?.matrizId) {
      const matriz = await prisma.empresa.findUnique({
        where: { id: empresa.matrizId },
        select: { addonTotem: true },
      });
      temAddon = matriz?.addonTotem === true;
    }

    if (!temAddon) {
      // empresa sem totem — se houver índice antigo, deixa quieto (custo é desprezível)
      return;
    }

    // Remove rosto antigo (se houver) — pra não acumular múltiplas faces da mesma pessoa
    if (u.rekognitionFaceId) {
      await removerRosto(u.empresaId, u.rekognitionFaceId);
    }

    // Indexa nova foto
    if (!u.fotoPerfilUrl) {
      // sem foto — só limpa o faceId antigo
      if (u.rekognitionFaceId) {
        await prisma.usuario.update({
          where: { id: u.id },
          data: { rekognitionFaceId: null },
        });
      }
      return;
    }

    const resultado = await indexarRosto({
      empresaId: u.empresaId,
      usuarioId: u.id,
      fotoReferenciaUrl: u.fotoPerfilUrl,
    });

    await prisma.usuario.update({
      where: { id: u.id },
      data: { rekognitionFaceId: resultado.faceId },
    });

    if (!resultado.faceId) {
      console.warn(`[totem] usuário ${u.id} sem rosto detectável na foto`);
    }
  } catch (err) {
    console.error('[totem] reindexarRostoUsuario falhou:', err);
  }
}
