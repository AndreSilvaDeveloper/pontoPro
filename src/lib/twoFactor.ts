/**
 * Utilitários de 2FA (TOTP + backup codes).
 */
import * as OTPAuth from 'otpauth';
import crypto from 'crypto';

export function generateSecret(label: string, issuer = 'WorkID') {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer,
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
  return {
    base32: secret.base32,
    uri: totp.toString(),
  };
}

export function verifyToken(base32Secret: string, token: string): boolean {
  if (!base32Secret || !token || !/^\d{6}$/.test(token.trim())) return false;
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'WorkID',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(base32Secret),
    });
    // window=1 aceita o código anterior e o próximo (tolerância a clock drift)
    const delta = totp.validate({ token: token.trim(), window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

/** Gera 10 códigos de backup e retorna {plain, hashed} */
export function generateBackupCodes(): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
    plain.push(code);
    hashed.push(hashCode(code));
  }
  return { plain, hashed };
}

export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

/**
 * Verifica se o código de backup é válido. Se for, retorna a lista atualizada
 * (sem o código usado — backup codes são single-use).
 */
export function consumeBackupCode(hashedCodes: string[], input: string): string[] | null {
  const target = hashCode(input);
  const idx = hashedCodes.indexOf(target);
  if (idx === -1) return null;
  return hashedCodes.filter((_, i) => i !== idx);
}
