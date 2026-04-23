export const SITE_NAME = 'WorkID';

function readBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || 'https://workid.com.br';
  return raw.replace(/\/+$/, '');
}

export const BASE_URL = readBaseUrl();

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'workid.com.br';
  }
}

const MAIN_DOMAIN = extractDomain(BASE_URL);

export const EMAIL_CONTACT = process.env.EMAIL_CONTACT || `contato@${MAIN_DOMAIN}`;
export const EMAIL_NO_REPLY = process.env.EMAIL_NO_REPLY || `nao-responda@${MAIN_DOMAIN}`;
export const EMAIL_SUPPORT = process.env.EMAIL_SUPPORT || `suporte@${MAIN_DOMAIN}`;
