import { enviarCodigo, gerarCodigo } from '@/lib/sms';

type CodigoPendente = { codigo: string; expira: number };
type Validado = { expira: number };

const CODIGO_TTL_MS = 10 * 60_000;
const VALIDADO_TTL_MS = 30 * 60_000;
const REENVIO_MIN_MS = 60_000;

const codigosPendentes = new Map<string, CodigoPendente>();
const telefonesValidados = new Map<string, Validado>();
const ultimoEnvio = new Map<string, number>();

function limparExpirados() {
  const agora = Date.now();
  for (const [k, v] of codigosPendentes) if (v.expira < agora) codigosPendentes.delete(k);
  for (const [k, v] of telefonesValidados) if (v.expira < agora) telefonesValidados.delete(k);
}

function normalizar(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

export type PedirCodigoResult =
  | { ok: true; canal: 'whatsapp' | 'sms' }
  | { ok: false; erro: string; aguardarSegundos?: number };

export async function pedirCodigoWhatsapp(telefoneRaw: string): Promise<PedirCodigoResult> {
  const telefone = normalizar(telefoneRaw);
  if (telefone.length < 10 || telefone.length > 11) {
    return { ok: false, erro: 'Telefone inválido.' };
  }

  limparExpirados();

  const ultimo = ultimoEnvio.get(telefone) ?? 0;
  const agora = Date.now();
  if (agora - ultimo < REENVIO_MIN_MS) {
    const aguardarSegundos = Math.ceil((REENVIO_MIN_MS - (agora - ultimo)) / 1000);
    return { ok: false, erro: `Aguarde ${aguardarSegundos}s para reenviar.`, aguardarSegundos };
  }

  const codigo = gerarCodigo();
  const result = await enviarCodigo(telefone, codigo);
  if (!result.ok) {
    return { ok: false, erro: 'Falha ao enviar código. Verifique o número.' };
  }

  codigosPendentes.set(telefone, { codigo, expira: agora + CODIGO_TTL_MS });
  ultimoEnvio.set(telefone, agora);

  return { ok: true, canal: result.canal };
}

export type ValidarCodigoResult =
  | { ok: true }
  | { ok: false; erro: string };

export function validarCodigoWhatsapp(telefoneRaw: string, codigo: string): ValidarCodigoResult {
  const telefone = normalizar(telefoneRaw);
  limparExpirados();

  const pendente = codigosPendentes.get(telefone);
  if (!pendente) {
    return { ok: false, erro: 'Código expirado ou não solicitado. Envie um novo.' };
  }
  if (pendente.codigo !== String(codigo).trim()) {
    return { ok: false, erro: 'Código incorreto.' };
  }

  codigosPendentes.delete(telefone);
  telefonesValidados.set(telefone, { expira: Date.now() + VALIDADO_TTL_MS });

  return { ok: true };
}

export function isTelefoneValidado(telefoneRaw: string): boolean {
  const telefone = normalizar(telefoneRaw);
  limparExpirados();
  const v = telefonesValidados.get(telefone);
  return !!(v && v.expira > Date.now());
}

export function consumirValidacao(telefoneRaw: string): void {
  telefonesValidados.delete(normalizar(telefoneRaw));
}
