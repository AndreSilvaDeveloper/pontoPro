import { enviarOtp, validarOtp, type CanalMensagem } from './messaging';

const VALIDADO_TTL_MS = 30 * 60_000;
const REENVIO_MIN_MS = 60_000;

const telefonesValidados = new Map<string, number>();
const ultimoEnvio = new Map<string, number>();

function normalizar(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

function limparExpirados() {
  const agora = Date.now();
  for (const [k, v] of telefonesValidados) if (v < agora) telefonesValidados.delete(k);
}

export type PedirCodigoResult =
  | { ok: true; canal: CanalMensagem }
  | { ok: false; erro: string; aguardarSegundos?: number };

export async function pedirCodigoWhatsapp(
  telefoneRaw: string,
  canal: CanalMensagem = 'sms'
): Promise<PedirCodigoResult> {
  const telefone = normalizar(telefoneRaw);
  if (telefone.length < 10 || telefone.length > 11) {
    return { ok: false, erro: 'Telefone inválido.' };
  }

  const ultimo = ultimoEnvio.get(telefone) ?? 0;
  const agora = Date.now();
  if (agora - ultimo < REENVIO_MIN_MS) {
    const aguardarSegundos = Math.ceil((REENVIO_MIN_MS - (agora - ultimo)) / 1000);
    return { ok: false, erro: `Aguarde ${aguardarSegundos}s para reenviar.`, aguardarSegundos };
  }

  const result = await enviarOtp(telefoneRaw, canal);
  if (!result.ok) {
    return { ok: false, erro: result.erro || 'Falha ao enviar código.' };
  }

  ultimoEnvio.set(telefone, agora);
  return { ok: true, canal: result.canal };
}

export type ValidarCodigoResult = { ok: true } | { ok: false; erro: string };

export async function validarCodigoWhatsapp(
  telefoneRaw: string,
  codigo: string
): Promise<ValidarCodigoResult> {
  const result = await validarOtp(telefoneRaw, codigo);
  if (!result.ok) return { ok: false, erro: result.erro };

  const telefone = normalizar(telefoneRaw);
  telefonesValidados.set(telefone, Date.now() + VALIDADO_TTL_MS);
  return { ok: true };
}

export function isTelefoneValidado(telefoneRaw: string): boolean {
  limparExpirados();
  const telefone = normalizar(telefoneRaw);
  const v = telefonesValidados.get(telefone);
  return !!(v && v > Date.now());
}

export function consumirValidacao(telefoneRaw: string): void {
  telefonesValidados.delete(normalizar(telefoneRaw));
}
