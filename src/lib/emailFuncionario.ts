import { BASE_URL } from '@/config/site';

/**
 * E-mail enviado ao funcionário com o link de ativação (primeiro acesso / reenvio).
 * O link leva pra tela onde ele cria a própria senha e já entra no sistema.
 */
export function htmlEmailAtivacao(opts: {
  nome: string;
  nomeEmpresa: string;
  link: string;
  email: string;
}): string {
  const { nome, nomeEmpresa, link, email } = opts;
  const host = BASE_URL.replace(/^https?:\/\//, '');
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">

      <div style="background-color: #5b21b6; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; letter-spacing: -0.5px;">WorkID</h1>
          <p style="color: #ddd6fe; margin: 5px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Ative seu acesso</p>
      </div>

      <div style="padding: 40px 30px;">
          <p style="color: #374151; font-size: 18px; margin-bottom: 20px;">Olá, <strong>${nome}</strong>! 👋</p>

          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 28px; font-size: 15px;">
              Bem-vindo(a) à equipe <strong>${nomeEmpresa}</strong>! Você já pode usar o sistema de ponto digital.
              É rapidinho: clique no botão abaixo e crie a sua senha.
          </p>

          <div style="text-align: center; margin-bottom: 28px;">
              <a href="${link}" style="display: inline-block; background-color: #5b21b6; color: #ffffff; font-weight: bold; text-decoration: none; padding: 16px 44px; border-radius: 50px; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(91, 33, 182, 0.3);">
                  Criar minha senha e entrar
              </a>
          </div>

          <p style="color: #6b7280; font-size: 13px; text-align: center; margin-bottom: 24px;">
              Se o botão não funcionar, copie e cole este endereço no navegador:<br>
              <span style="color: #5b21b6; word-break: break-all;">${link}</span>
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px;">
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                  Este link vale por <strong>7 dias</strong> e só pode ser usado uma vez.
                  Depois disso, é só entrar em <strong>${host}/login</strong> com o seu e-mail (<strong>${email}</strong>) e a senha que você criou.
                  Se o link expirar, peça um novo para o responsável pela sua empresa.
              </p>
          </div>
      </div>

      <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
              © 2025 WorkID • Tecnologia em Gestão<br>
              Este e-mail foi enviado por solicitação de <strong>${nomeEmpresa}</strong>.
          </p>
      </div>
    </div>
  `;
}

export function assuntoEmailAtivacao(nome: string, nomeEmpresa: string): string {
  return `${nome}, ative seu acesso na ${nomeEmpresa} 🚀`;
}
