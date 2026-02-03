import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade • WorkID",
  description: "Política de Privacidade do WorkID (LGPD).",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#0a0e27] text-slate-100">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8">
          <Link href="/" className="text-purple-300 hover:text-purple-200 underline underline-offset-4">
            ← Voltar
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-slate-400">
            Última atualização: <b>29/01/2026</b>
          </p>
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0f1535]/95 to-[#0a0e27]/95 p-6 shadow-2xl shadow-purple-500/10 backdrop-blur">
          <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white">
            <p>
              Esta Política de Privacidade descreve como o <b>WorkID</b> (“nós”) coleta, usa e protege
              dados pessoais de usuários, administradores e colaboradores (“você”) no contexto do sistema
              de gestão de ponto e serviços relacionados, em conformidade com a <b>LGPD (Lei 13.709/2018)</b>.
            </p>

            <h2>1. Quem controla os dados</h2>
            <ul>
              <li>
                <b>Cliente (Empresa)</b>: em geral, a empresa que contrata o WorkID é a <b>Controladora</b> dos dados
                de seus colaboradores.
              </li>
              <li>
                <b>WorkID</b>: atua normalmente como <b>Operadora</b>, tratando dados conforme instruções do Cliente,
                para prestar o serviço.
              </li>
            </ul>

            <h2>2. Dados que coletamos</h2>
            <ul>
              <li><b>Cadastro</b>: nome, e-mail, empresa, CNPJ (opcional), credenciais (senha criptografada).</li>
              <li>
                <b>Uso do sistema</b>: registros de acesso, logs de auditoria, horários de ponto, justificativas,
                escalas e permissões.
              </li>
              <li>
                <b>Dados do dispositivo</b>: identificadores técnicos (ex.: navegador, sistema operacional),
                endereço IP, data/hora de acesso.
              </li>
              <li>
                <b>Dados biométricos/foto</b> (se habilitado pela empresa): imagens para reconhecimento facial
                e validações de segurança.
              </li>
              <li>
                <b>Localização</b> (se habilitado): geolocalização para cerca eletrônica/raio permitido.
              </li>
            </ul>

            <h2>3. Finalidades do tratamento</h2>
            <ul>
              <li>Fornecer o serviço de ponto e gestão (cadastro, autenticação, operação e relatórios).</li>
              <li>Segurança (prevenção a fraudes, auditoria e controle de acesso).</li>
              <li>Melhorias do sistema (telemetria agregada e diagnósticos).</li>
              <li>Suporte e comunicação operacional (ex.: avisos de cobrança, mudanças de status do serviço).</li>
            </ul>

            <h2>4. Bases legais</h2>
            <ul>
              <li><b>Execução de contrato</b> e procedimentos preliminares (prestação do serviço).</li>
              <li><b>Legítimo interesse</b> (segurança, auditoria, prevenção a fraudes), quando aplicável.</li>
              <li><b>Consentimento</b> (quando exigido, ex.: recursos sensíveis habilitados pela empresa).</li>
              <li><b>Cumprimento de obrigação legal/regulatória</b> (ex.: demandas trabalhistas e fiscais).</li>
            </ul>

            <h2>5. Compartilhamento</h2>
            <p>
              Podemos compartilhar dados com provedores essenciais (ex.: hospedagem, banco de dados, e-mail transacional),
              sempre com medidas de segurança e finalidade compatível. Não vendemos dados pessoais.
            </p>

            <h2>6. Armazenamento e segurança</h2>
            <ul>
              <li>Criptografia de senha e medidas técnicas/organizacionais de proteção.</li>
              <li>Controle de acesso por papéis (admin/usuário) e trilhas de auditoria.</li>
              <li>Backups e monitoramento para continuidade e integridade do serviço.</li>
            </ul>

            <h2>7. Retenção</h2>
            <p>
              Mantemos dados pelo período necessário para cumprir as finalidades e obrigações legais.
              Após, descartamos ou anonimizamos quando possível.
            </p>

            <h2>8. Direitos do titular</h2>
            <p>
              Você pode solicitar confirmação, acesso, correção, portabilidade, eliminação, revogação de consentimento
              e informações sobre compartilhamento, conforme LGPD.
            </p>

            <h2>9. Encarregado (DPO) e contato</h2>
            <p>
              Para solicitações de privacidade e LGPD, entre em contato:
              <br />
              <b>E-mail:</b> suporte@workid.com.br (ajuste para o seu e-mail real)
            </p>

            <h2>10. Atualizações desta política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Quando houver mudanças relevantes, informaremos no sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
