import {
  RekognitionClient,
  CompareFacesCommand,
  CreateCollectionCommand,
  DescribeCollectionCommand,
  IndexFacesCommand,
  DeleteFacesCommand,
  SearchFacesByImageCommand,
} from "@aws-sdk/client-rekognition";
import fs from 'fs';
import path from 'path';

const client = new RekognitionClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function carregarFotoReferencia(fotoReferenciaUrl: string): Promise<Buffer> {
  // Se for um caminho local /api/uploads/..., lê do disco direto (evita auto-fetch lento)
  const marker = '/api/uploads/';
  const idx = fotoReferenciaUrl.indexOf(marker);
  if (idx !== -1) {
    const LOCAL_DIR = process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'uploads');
    const relativePath = fotoReferenciaUrl.substring(idx + marker.length).split('?')[0];
    const absolutePath = path.join(LOCAL_DIR, relativePath);
    if (fs.existsSync(absolutePath)) {
      return fs.readFileSync(absolutePath);
    }
  }

  // Fallback: fetch HTTP
  const urlAbsoluta = fotoReferenciaUrl.startsWith('/')
    ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${fotoReferenciaUrl}`
    : fotoReferenciaUrl;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const responseRef = await fetch(urlAbsoluta, { signal: controller.signal });
    if (!responseRef.ok) throw new Error("Não consegui baixar a foto de referência");
    return Buffer.from(await responseRef.arrayBuffer());
  } finally {
    clearTimeout(timeoutId);
  }
}

function base64ToBuffer(b64: string): Buffer {
  const semHeader = b64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(semHeader, 'base64');
}

// =============================================================================
// MODO APP — comparação 1:1 (compatibilidade com fluxo existente)
// =============================================================================

export async function compararRostos(fotoReferenciaUrl: string, fotoAtualBase64: string): Promise<{ igual: boolean; confianca: number }> {
  try {
    const fotoAtualBuffer = base64ToBuffer(fotoAtualBase64);
    const fotoRefBuffer = await carregarFotoReferencia(fotoReferenciaUrl);

    const command = new CompareFacesCommand({
      SourceImage: { Bytes: fotoRefBuffer },
      TargetImage: { Bytes: fotoAtualBuffer },
      SimilarityThreshold: 90,
    });

    const response = await client.send(command);

    if (response.FaceMatches && response.FaceMatches.length > 0) {
      const confianca = response.FaceMatches[0].Similarity || 0;
      console.log(`✅ Reconhecido pela AWS! Semelhança: ${confianca.toFixed(2)}%`);
      return { igual: true, confianca };
    }

    console.log("❌ AWS não reconheceu o rosto.");
    return { igual: false, confianca: 0 };

  } catch (error) {
    console.error("Erro na AWS Rekognition:", error);
    return { igual: false, confianca: 0 };
  }
}

// =============================================================================
// MODO TOTEM — coleção 1:N por empresa
// =============================================================================

const TOTEM_FACE_THRESHOLD = 95; // mais rigoroso que o app (totem expõe a fraude)

export function nomeColecaoEmpresa(empresaId: string) {
  // AWS exige [a-zA-Z0-9_.-] e tamanho <= 255
  return `workid_emp_${empresaId}`;
}

/**
 * Garante que a coleção da empresa existe. Idempotente.
 * Retorna o ID da coleção.
 */
export async function garantirColecaoEmpresa(empresaId: string): Promise<string> {
  const collectionId = nomeColecaoEmpresa(empresaId);
  try {
    await client.send(new DescribeCollectionCommand({ CollectionId: collectionId }));
    return collectionId;
  } catch (err: any) {
    if (err?.name === 'ResourceNotFoundException') {
      await client.send(new CreateCollectionCommand({ CollectionId: collectionId }));
      console.log(`[rekognition] coleção criada: ${collectionId}`);
      return collectionId;
    }
    throw err;
  }
}

/**
 * Indexa o rosto do funcionário na coleção da empresa.
 * Se já tinha um faceId anterior, deve ser removido antes (chame `removerRosto`).
 * Retorna o FaceId pra salvar em `Usuario.rekognitionFaceId`.
 */
export async function indexarRosto(input: {
  empresaId: string;
  usuarioId: string;
  fotoReferenciaUrl: string;
}): Promise<{ faceId: string | null; confianca: number }> {
  try {
    const collectionId = await garantirColecaoEmpresa(input.empresaId);
    const buffer = await carregarFotoReferencia(input.fotoReferenciaUrl);

    const cmd = new IndexFacesCommand({
      CollectionId: collectionId,
      Image: { Bytes: buffer },
      ExternalImageId: input.usuarioId,
      DetectionAttributes: ['DEFAULT'],
      MaxFaces: 1,
      QualityFilter: 'AUTO',
    });

    const res = await client.send(cmd);
    const record = res.FaceRecords?.[0];
    if (!record?.Face?.FaceId) {
      console.warn(`[rekognition] não detectou rosto pro usuário ${input.usuarioId}`);
      return { faceId: null, confianca: 0 };
    }

    return { faceId: record.Face.FaceId, confianca: record.Face.Confidence ?? 0 };
  } catch (err) {
    console.error('[rekognition] erro ao indexar rosto:', err);
    return { faceId: null, confianca: 0 };
  }
}

/**
 * Remove um rosto da coleção da empresa (ex: ao trocar foto ou desligar funcionário).
 */
export async function removerRosto(empresaId: string, faceId: string): Promise<boolean> {
  try {
    const collectionId = nomeColecaoEmpresa(empresaId);
    await client.send(new DeleteFacesCommand({
      CollectionId: collectionId,
      FaceIds: [faceId],
    }));
    return true;
  } catch (err) {
    console.error('[rekognition] erro ao remover rosto:', err);
    return false;
  }
}

/**
 * Busca o rosto na coleção da empresa (1:N).
 * Retorna o usuarioId (ExternalImageId) do match com maior confiança, ou null.
 */
export async function buscarRostoNaColecao(input: {
  empresaId: string;
  fotoBase64: string;
}): Promise<{ usuarioId: string | null; confianca: number }> {
  try {
    const collectionId = nomeColecaoEmpresa(input.empresaId);
    const buffer = base64ToBuffer(input.fotoBase64);

    const cmd = new SearchFacesByImageCommand({
      CollectionId: collectionId,
      Image: { Bytes: buffer },
      MaxFaces: 1,
      FaceMatchThreshold: TOTEM_FACE_THRESHOLD,
      QualityFilter: 'AUTO',
    });

    const res = await client.send(cmd);
    const match = res.FaceMatches?.[0];
    if (!match?.Face?.ExternalImageId) {
      return { usuarioId: null, confianca: 0 };
    }

    return { usuarioId: match.Face.ExternalImageId, confianca: match.Similarity ?? 0 };
  } catch (err: any) {
    // InvalidParameterException acontece quando não há rosto na imagem
    if (err?.name === 'InvalidParameterException') {
      return { usuarioId: null, confianca: 0 };
    }
    // ResourceNotFoundException: coleção ainda não criada (empresa sem totem ativo)
    if (err?.name === 'ResourceNotFoundException') {
      return { usuarioId: null, confianca: 0 };
    }
    console.error('[rekognition] erro ao buscar rosto:', err);
    return { usuarioId: null, confianca: 0 };
  }
}
