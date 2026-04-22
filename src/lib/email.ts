import { Resend } from 'resend';
import { EMAIL_NO_REPLY, SITE_NAME } from '@/config/site';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123');

// Função genérica para enviar e-mail sem travar o sistema
export async function enviarEmailSeguro(para: string, assunto: string, html: string) {
  try {
    // Tenta enviar
    await resend.emails.send({
      from: `${SITE_NAME} <${EMAIL_NO_REPLY}>`,
      to: para,
      subject: assunto,
      html: html,
    });
    console.log(`📧 E-mail enviado para ${para}`);
  } catch (error) {
    // SE DER ERRO (E-mail não existe, erro de rede, etc):
    // Apenas logamos no console, mas NÃO jogamos o erro pra cima.
    // Assim, o cadastro do funcionário continua 100% normal.
    console.error(`❌ Falha ao enviar e-mail para ${para}. Motivo:`, error);
  }
}