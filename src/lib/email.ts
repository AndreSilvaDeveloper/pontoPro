import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Função genérica para enviar e-mail sem travar o sistema
export async function enviarEmailSeguro(para: string, assunto: string, html: string) {
  try {
    // Tenta enviar
    await resend.emails.send({
      from: 'WorkID <nao-responda@ontimeia.com>', 
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