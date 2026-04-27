import { enviarEmailSeguro } from './email';
import { enviarSMS, enviarWhatsApp } from './sms';

const ALERT_EMAIL = process.env.LEAD_ALERT_EMAIL || '';
const ALERT_PHONE = process.env.LEAD_ALERT_PHONE || '';

export type LeadOrigem = 'AGENDAR_DEMO' | 'SIGNUP' | 'CONTATO';

type NotificarLeadInput = {
  origem: LeadOrigem;
  nome: string;
  email?: string | null;
  whatsapp?: string | null;
  empresa?: string | null;
  detalhes?: Record<string, string | number | undefined | null>;
};

const ROTULO_ORIGEM: Record<LeadOrigem, string> = {
  AGENDAR_DEMO: 'Agendamento de demo',
  SIGNUP: 'Cadastro novo',
  CONTATO: 'Formulário de contato',
};

function montarLinhasTxt(input: NotificarLeadInput): string[] {
  const linhas: string[] = [];
  linhas.push(`[WorkID] ${ROTULO_ORIGEM[input.origem]}`);
  linhas.push(`Nome: ${input.nome}`);
  if (input.email) linhas.push(`Email: ${input.email}`);
  if (input.whatsapp) linhas.push(`WhatsApp: ${input.whatsapp}`);
  if (input.empresa) linhas.push(`Empresa: ${input.empresa}`);
  if (input.detalhes) {
    for (const [k, v] of Object.entries(input.detalhes)) {
      if (v === undefined || v === null || v === '') continue;
      linhas.push(`${k}: ${v}`);
    }
  }
  return linhas;
}

function montarHtml(input: NotificarLeadInput): string {
  const linhas = montarLinhasTxt(input).slice(1);
  const linksAcao: string[] = [];
  if (input.whatsapp) {
    const num = input.whatsapp.replace(/\D/g, '');
    linksAcao.push(`<a href="https://wa.me/${num}" style="display:inline-block;padding:10px 16px;background:#22c55e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin-right:8px">Abrir WhatsApp</a>`);
  }
  if (input.email) {
    linksAcao.push(`<a href="mailto:${input.email}" style="display:inline-block;padding:10px 16px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Responder por e-mail</a>`);
  }

  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
        <div style="font-size:13px;opacity:.85;letter-spacing:.05em;text-transform:uppercase">Novo lead — WorkID</div>
        <div style="font-size:22px;font-weight:800;margin-top:4px">${ROTULO_ORIGEM[input.origem]}</div>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:0;padding:20px 24px;border-radius:0 0 12px 12px">
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#111">
          ${linhas.map(l => {
            const idx = l.indexOf(':');
            const k = idx > 0 ? l.slice(0, idx) : l;
            const v = idx > 0 ? l.slice(idx + 1).trim() : '';
            return `<tr><td style="padding:6px 0;color:#6b7280;width:120px">${k}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`;
          }).join('')}
        </table>
        ${linksAcao.length ? `<div style="margin-top:16px">${linksAcao.join('')}</div>` : ''}
        <div style="margin-top:18px;color:#9ca3af;font-size:12px">Aja rápido: lead respondido em até 5 min converte muito mais.</div>
      </div>
    </div>
  `;
}

/**
 * Notifica o admin sobre um novo lead via e-mail (Resend) e SMS (Twilio).
 * Nunca lança — falhas são apenas logadas para não bloquear o cadastro/agendamento.
 */
export async function notificarLead(input: NotificarLeadInput): Promise<void> {
  const tarefas: Promise<unknown>[] = [];

  if (ALERT_EMAIL) {
    const assunto = `[WorkID] Novo lead — ${ROTULO_ORIGEM[input.origem]}: ${input.nome}`;
    tarefas.push(enviarEmailSeguro(ALERT_EMAIL, assunto, montarHtml(input)));
  } else {
    console.warn('[leadAlert] LEAD_ALERT_EMAIL não configurado — pulando email');
  }

  if (ALERT_PHONE) {
    const txt = montarLinhasTxt(input).join('\n').slice(0, 320);
    // Tenta WhatsApp (se TWILIO_WHATSAPP_NUMBER existir); fallback SMS
    if (process.env.TWILIO_WHATSAPP_NUMBER) {
      tarefas.push(enviarWhatsApp(ALERT_PHONE, txt).catch(err => {
        console.error('[leadAlert] WhatsApp falhou, tentando SMS:', err);
        return enviarSMS(ALERT_PHONE, txt);
      }));
    } else {
      tarefas.push(enviarSMS(ALERT_PHONE, txt));
    }
  } else {
    console.warn('[leadAlert] LEAD_ALERT_PHONE não configurado — pulando SMS/WhatsApp');
  }

  await Promise.allSettled(tarefas);
}
