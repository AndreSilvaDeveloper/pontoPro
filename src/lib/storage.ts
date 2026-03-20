/**
 * Storage local na VPS.
 *
 * Arquivos são salvos em duas categorias:
 *   - "permanente": fotos de perfil, assinaturas, PDFs de termos, logos
 *   - "temporario": fotos de ponto diário, comprovantes de atestado
 *
 * Arquivos temporários são limpos automaticamente pelo cron após DIAS_RETENCAO dias.
 *
 * .env necessário na VPS:
 *   STORAGE_LOCAL_DIR=/home/pluri/meuProjeto/ponto-pro/uploads
 *   NEXT_PUBLIC_BASE_URL=https://ontimeia.com
 *
 * Em staging (Vercel), define STORAGE_MODE=vercel para usar Vercel Blob.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const STORAGE_MODE = process.env.STORAGE_MODE || (process.env.BLOB_READ_WRITE_TOKEN ? 'vercel' : 'local');
const LOCAL_DIR = process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'uploads');
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';

export const DIAS_RETENCAO = 60; // dias para manter arquivos temporários

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function toBuffer(data: Buffer | Blob | ArrayBuffer | ReadableStream): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (data instanceof Blob) return Buffer.from(await data.arrayBuffer());
  // ReadableStream
  const reader = (data as ReadableStream).getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Salva um arquivo.
 * @param filename - caminho relativo (ex: "pontos/foto.jpg")
 * @param data - conteúdo do arquivo
 * @param options.contentType - mime type
 * @param options.permanente - se true, salva em "permanente/", senão em "temporario/"
 */
export async function storagePut(
  filename: string,
  data: Buffer | Blob | ArrayBuffer | ReadableStream,
  options?: { access?: string; contentType?: string; permanente?: boolean }
): Promise<{ url: string }> {

  if (STORAGE_MODE === 'vercel') {
    const { put } = await import('@vercel/blob');
    return put(filename, data, { access: 'public' as const, contentType: options?.contentType });
  }

  // === LOCAL ===
  const categoria = options?.permanente ? 'permanente' : 'temporario';
  const ext = path.extname(filename) || '.bin';
  const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const hash = crypto.randomBytes(6).toString('hex');
  const finalName = `${baseName}-${hash}${ext}`;

  const dirPart = path.dirname(filename);
  const relativePath = path.join(categoria, dirPart, finalName);
  const absolutePath = path.join(LOCAL_DIR, relativePath);

  ensureDir(absolutePath);

  const buffer = await toBuffer(data);
  fs.writeFileSync(absolutePath, buffer);

  const url = `${BASE_URL}/api/uploads/${relativePath.replace(/\\/g, '/')}`;
  return { url };
}

/**
 * Remove um arquivo.
 */
export async function storageDel(url: string): Promise<void> {
  if (STORAGE_MODE === 'vercel') {
    const { del } = await import('@vercel/blob');
    await del(url);
    return;
  }

  const marker = '/api/uploads/';
  const idx = url.indexOf(marker);
  if (idx === -1) return;

  const relativePath = url.substring(idx + marker.length);
  const absolutePath = path.join(LOCAL_DIR, relativePath);

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

/**
 * Limpa arquivos temporários mais antigos que DIAS_RETENCAO.
 * Chamado pelo cron de limpeza.
 */
export function limparTemporarios(diasRetencao: number = DIAS_RETENCAO): { removidos: number; erros: number } {
  const tempDir = path.join(LOCAL_DIR, 'temporario');
  if (!fs.existsSync(tempDir)) return { removidos: 0, erros: 0 };

  const limite = Date.now() - diasRetencao * 24 * 60 * 60 * 1000;
  let removidos = 0;
  let erros = 0;

  function limparRecursivo(dir: string) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        limparRecursivo(fullPath);
        // Remover diretório vazio
        try {
          const remaining = fs.readdirSync(fullPath);
          if (remaining.length === 0) fs.rmdirSync(fullPath);
        } catch {}
      } else if (stat.isFile()) {
        if (stat.mtimeMs < limite) {
          try {
            fs.unlinkSync(fullPath);
            removidos++;
          } catch {
            erros++;
          }
        }
      }
    }
  }

  limparRecursivo(tempDir);
  return { removidos, erros };
}
