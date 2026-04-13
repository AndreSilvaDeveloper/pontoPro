import { RekognitionClient, CompareFacesCommand } from "@aws-sdk/client-rekognition";
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

export async function compararRostos(fotoReferenciaUrl: string, fotoAtualBase64: string): Promise<{ igual: boolean; confianca: number }> {
  try {
    // 1. Converter a foto atual (Base64) para Binário
    const base64Data = fotoAtualBase64.replace(/^data:image\/\w+;base64,/, "");
    const fotoAtualBuffer = Buffer.from(base64Data, 'base64');

    // 2. Carregar foto de referência (disco se local, fetch caso contrário)
    const fotoRefBuffer = await carregarFotoReferencia(fotoReferenciaUrl);

    // 3. Perguntar para a Amazon AWS
    const command = new CompareFacesCommand({
      SourceImage: { Bytes: fotoRefBuffer }, // Foto Original
      TargetImage: { Bytes: fotoAtualBuffer }, // Foto da Câmera Agora
      SimilarityThreshold: 90, // Nível de exigência (90%)
    });

    const response = await client.send(command);

    // Se a IA disse que parece, retorna SUCESSO
    if (response.FaceMatches && response.FaceMatches.length > 0) {
      const confianca = response.FaceMatches[0].Similarity || 0;
      console.log(`✅ Reconhecido pela AWS! Semelhança: ${confianca.toFixed(2)}%`);
      return { igual: true, confianca };
    }

    console.log("❌ AWS não reconheceu o rosto.");
    return { igual: false, confianca: 0 };

  } catch (error) {
    console.error("Erro na AWS Rekognition:", error);
    // Se der erro técnico, vamos bloquear por segurança
    return { igual: false, confianca: 0 };
  }
}