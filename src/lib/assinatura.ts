import fs from 'fs';
import path from 'path';

/**
 * Converte uma URL de assinatura em data URL base64 (server-side).
 * Resolve CORS no client quando o admin/funcionário acessa por subdomínio
 * diferente do storage (ex: app.workid.com.br lendo /api/uploads em workid.com.br)
 * ou quando a URL aponta pra storage externo (Vercel Blob).
 *
 * - URL com "/api/uploads/..." → lê direto do disco
 * - URL absoluta → fetch server-side (sem CORS)
 */
export async function carregarAssinaturaBase64(assinaturaUrl: string | null): Promise<string | null> {
  if (!assinaturaUrl) return null;

  try {
    const marker = '/api/uploads/';
    const idx = assinaturaUrl.indexOf(marker);

    if (idx !== -1) {
      const LOCAL_DIR = process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'uploads');
      const relativePath = assinaturaUrl.substring(idx + marker.length).split('?')[0];
      const absolutePath = path.join(LOCAL_DIR, relativePath);
      if (!absolutePath.startsWith(LOCAL_DIR)) return null;
      if (!fs.existsSync(absolutePath)) {
        console.warn('[assinatura] arquivo não existe no disco:', absolutePath);
        return null;
      }
      const buffer = fs.readFileSync(absolutePath);
      const ext = path.extname(absolutePath).toLowerCase();
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    }

    const res = await fetch(assinaturaUrl);
    if (!res.ok) {
      console.warn('[assinatura] falha ao baixar:', res.status, assinaturaUrl);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') || 'image/png';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.error('[assinatura] erro ao carregar:', err);
    return null;
  }
}
