import { Resend } from 'resend';
import { EMAIL_NO_REPLY, SITE_NAME } from '@/config/site';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123');

// FROM permite override por env (útil quando domínio ainda não está verificado no Resend
// e precisamos cair no fallback "onboarding@resend.dev")
const FROM_ADDRESS = process.env.RESEND_FROM || `${SITE_NAME} <${EMAIL_NO_REPLY}>`;

export async function enviarEmailSeguro(para: string, assunto: string, html: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: para,
      subject: assunto,
      html: html,
    });

    if (error) {
      // Resend retorna o erro como objeto, não como throw — precisamos checar
      console.error(`❌ Resend rejeitou email para ${para}:`, JSON.stringify(error));
      return;
    }

    console.log(`📧 E-mail enviado para ${para} (id: ${data?.id})`);
  } catch (error) {
    console.error(`❌ Falha ao enviar e-mail para ${para}. Motivo:`, error);
  }
}