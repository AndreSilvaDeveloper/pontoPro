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
export async function reindexarRostoUsuario(usuarioId: string): Promise<boolean> {
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

    if (!u || !u.empresaId) return false;

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

    if (!temAddon) return false;

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
      return false;
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
      return false;
    }
    return true;
  } catch (err) {
    console.error('[totem] reindexarRostoUsuario falhou:', err);
    return false;
  }
}

/**
 * Indexa todos os funcionários da empresa que tenham foto cadastrada.
 * Idempotente — pode chamar sempre que o addon for (re)ativado.
 *
 * Usado quando o super admin liga `addonTotem` numa empresa que já tinha
 * funcionários cadastrados antes (os hooks de cadastro pulam quando o addon
 * está desligado, então é preciso uma pasada retroativa).
 *
 * Fire-and-forget: nunca lança, só loga.
 */
export async function indexarFuncionariosDaEmpresa(
  empresaId: string,
): Promise<{ total: number; indexados: number; falhas: number }> {
  const funcionarios = await prisma.usuario.findMany({
    where: { empresaId, fotoPerfilUrl: { not: null } },
    select: { id: true },
  });
  console.log(`[totem] indexação retroativa: ${funcionarios.length} funcionário(s) da empresa ${empresaId}`);
  let indexados = 0;
  let falhas = 0;
  for (const f of funcionarios) {
    try {
      const ok = await reindexarRostoUsuario(f.id);
      if (ok) indexados++;
      else falhas++;
    } catch (err) {
      falhas++;
      console.error(`[totem] falha ao indexar usuário ${f.id}:`, err);
    }
  }
  return { total: funcionarios.length, indexados, falhas };
}
