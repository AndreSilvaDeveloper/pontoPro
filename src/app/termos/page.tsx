// src/app/termos/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Termos de Uso • WorkID",
  description: "Termos de Uso do WorkID.",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#0a0e27] text-slate-100">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8">
          <Link
            href="/"
            className="text-purple-300 hover:text-purple-200 underline underline-offset-4"
          >
            ← Voltar
          </Link>

          <h1 className="mt-4 text-3xl font-extrabold">Termos de Uso</h1>
          <p className="mt-2 text-sm text-slate-400">
            Última atualização: <b>29/01/2026</b>
          </p>
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0f1535]/95 to-[#0a0e27]/95 p-6 shadow-2xl shadow-purple-500/10 backdrop-blur">
          <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white">
            <p>
              Estes Termos de Uso (“<b>Termos</b>”) regem o acesso e utilização do
              <b> WorkID</b> (“<b>Plataforma</b>”), um sistema de gestão de ponto e
              rotinas administrativas disponibilizado como serviço (“SaaS”).
              Ao criar conta, acessar ou utilizar a Plataforma, você declara que leu
              e concorda com estes Termos.
            </p>

            <h2>1. Definições</h2>
            <ul>
              <li>
                <b>WorkID</b>: a Plataforma e seus serviços.
              </li>
              <li>
                <b>Cliente</b>: empresa contratante da Plataforma.
              </li>
              <li>
                <b>Administrador</b>: usuário indicado pelo Cliente para gerenciar o sistema.
              </li>
              <li>
                <b>Colaborador/Usuário</b>: pessoa vinculada ao Cliente que registra ponto e utiliza recursos.
              </li>
            </ul>

            <h2>2. Elegibilidade e cadastro</h2>
            <ul>
              <li>
                O uso corporativo depende de cadastro do Cliente e criação do primeiro Administrador.
              </li>
              <li>
                Você se compromete a fornecer informações verdadeiras e mantê-las atualizadas.
              </li>
              <li>
                O acesso é pessoal e intransferível. O usuário é responsável por manter sua senha segura.
              </li>
            </ul>

            <h2>3. Uso permitido</h2>
            <p>Você concorda em utilizar a Plataforma apenas para finalidades lícitas e autorizadas.</p>
            <ul>
              <li>É proibido tentar invadir, explorar falhas, burlar controles de acesso ou coletar dados indevidamente.</li>
              <li>É proibido usar a Plataforma para atividades ilegais, fraudulentas ou que violem direitos de terceiros.</li>
              <li>O Cliente é responsável por configurar permissões e orientar seus usuários sobre uso correto.</li>
            </ul>

            <h2>4. Funcionalidades e disponibilidade</h2>
            <ul>
              <li>
                A Plataforma pode incluir recursos como registros de ponto, relatórios, auditoria,
                controle de jornada, geolocalização/cerca eletrônica e reconhecimento facial (quando habilitados).
              </li>
              <li>
                Podem ocorrer indisponibilidades por manutenção, atualizações, falhas de terceiros ou eventos fora de controle.
              </li>
              <li>
                Podemos atualizar, melhorar ou alterar funcionalidades para manter segurança e qualidade.
              </li>
            </ul>

            <h2>5. Pagamento, planos e suspensão</h2>
            <ul>
              <li>
                O uso pode estar sujeito a cobrança conforme plano contratado ou período de teste (“trial”).
              </li>
              <li>
                Em caso de atraso, o acesso pode ser suspenso até regularização, conforme aviso exibido no sistema.
              </li>
              <li>
                Valores, prazos e condições do plano podem ser ajustados com comunicação prévia quando aplicável.
              </li>
            </ul>

            <h2>6. Dados, privacidade e LGPD</h2>
            <ul>
              <li>
                O tratamento de dados pessoais segue a <b>Política de Privacidade</b>. Leia em{" "}
                <Link
                  href="/privacidade"
                  className="text-purple-300 hover:text-purple-200 underline underline-offset-4"
                >
                  /privacidade
                </Link>
                .
              </li>
              <li>
                Em geral, o Cliente atua como <b>Controlador</b> dos dados de seus colaboradores, e o WorkID como <b>Operador</b>.
              </li>
              <li>
                O Cliente é responsável por definir bases legais e políticas internas relacionadas a ponto, biometria e geolocalização,
                conforme legislação aplicável.
              </li>
            </ul>

            <h2>7. Propriedade intelectual</h2>
            <ul>
              <li>
                A Plataforma, marca, layout, códigos e conteúdos são protegidos por leis de propriedade intelectual.
              </li>
              <li>
                O Cliente recebe uma licença limitada, não exclusiva e revogável para uso durante a vigência do contrato/plano.
              </li>
            </ul>

            <h2>8. Suporte</h2>
            <p>
              O suporte pode ser oferecido por canais definidos pelo WorkID (ex.: e-mail, WhatsApp, sistema),
              com prazos variáveis conforme o plano e criticidade.
            </p>

            <h2>9. Limitação de responsabilidade</h2>
            <ul>
              <li>
                O WorkID busca alta disponibilidade e segurança, mas não garante funcionamento ininterrupto.
              </li>
              <li>
                Não nos responsabilizamos por falhas causadas por internet do usuário, dispositivos, configurações do Cliente,
                ou serviços de terceiros fora do nosso controle.
              </li>
              <li>
                O Cliente é responsável por validar relatórios e uso do ponto conforme regras internas e legislação.
              </li>
            </ul>

            <h2>10. Rescisão e encerramento</h2>
            <ul>
              <li>
                O Cliente pode solicitar encerramento conforme regras do plano/contrato.
              </li>
              <li>
                Podemos encerrar ou suspender acessos em caso de violação destes Termos, fraude, ou exigência legal.
              </li>
              <li>
                Após encerramento, dados podem ser retidos pelo período necessário para obrigações legais e/ou por solicitação do Cliente,
                conforme Política de Privacidade.
              </li>
            </ul>

            <h2>11. Alterações destes Termos</h2>
            <p>
              Podemos atualizar estes Termos periodicamente. Mudanças relevantes poderão ser comunicadas dentro do sistema.
              O uso continuado após atualização pode indicar concordância com a versão vigente.
            </p>

            <h2>12. Foro e legislação</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil.
              Fica eleito o foro da comarca do domicílio do Cliente, salvo disposição legal diferente.
            </p>

            <h2>13. Contato</h2>
            <p>
              Para dúvidas e solicitações: <b>suporte@workid.com.br</b> (ajuste para seu e-mail oficial).
            </p>

            <hr />

            <p className="text-sm text-slate-400">
              Observação: este documento é um modelo técnico/operacional. Se você precisa de termos específicos
              (ex.: SLA, LGPD com cláusulas contratuais, DPA/ANPD, regras de reembolso), recomendo validação jurídica.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
