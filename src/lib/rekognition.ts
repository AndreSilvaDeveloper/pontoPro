import { RekognitionClient, CompareFacesCommand } from "@aws-sdk/client-rekognition";

const client = new RekognitionClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function compararRostos(fotoReferenciaUrl: string, fotoAtualBase64: string): Promise<{ igual: boolean; confianca: number }> {
  try {
    // 1. Converter a foto atual (Base64) para Binário
    const base64Data = fotoAtualBase64.replace(/^data:image\/\w+;base64,/, "");
    const fotoAtualBuffer = Buffer.from(base64Data, 'base64');

    // 2. Baixar a foto de referência (que está no Vercel Blob)
    const responseRef = await fetch(fotoReferenciaUrl);
    if (!responseRef.ok) throw new Error("Não consegui baixar a foto de referência");
    const fotoRefBuffer = Buffer.from(await responseRef.arrayBuffer());

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