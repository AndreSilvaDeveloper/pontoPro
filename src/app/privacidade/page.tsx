import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Política de Privacidade • WorkID",
  description: "Política de Privacidade do WorkID (LGPD).",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,var(--color-border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border-subtle)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-14">
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            ← Voltar ao início
          </Link>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-text-primary">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Última atualização: <strong>29/01/2026</strong>
          </p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-surface/80 p-8 shadow-xl backdrop-blur-sm space-y-8">
          {/* Intro */}
          <p className="text-text-secondary leading-relaxed">
            Esta Política de Privacidade descreve como o <strong className="text-text-primary">WorkID</strong> ("nós")
            coleta, usa e protege dados pessoais de usuários, administradores e colaboradores ("você") no contexto
            do sistema de gestão de ponto e serviços relacionados, em conformidade com a{" "}
            <strong className="text-text-primary">LGPD (Lei 13.709/2018)</strong>.
          </p>

          {/* 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              1. Quem controla os dados
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>
                <strong className="text-text-primary">Cliente (Empresa)</strong>: em geral, a empresa que contrata
                o WorkID é a <strong className="text-text-primary">Controladora</strong> dos dados de seus colaboradores.
              </li>
              <li>
                <strong className="text-text-primary">WorkID</strong>: atua normalmente como{" "}
                <strong className="text-text-primary">Operadora</strong>, tratando dados conforme instruções do Cliente,
                para prestar o serviço.
              </li>
            </ul>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              2. Dados que coletamos
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>
                <strong className="text-text-primary">Cadastro</strong>: nome, e-mail, telefone, empresa,
                CNPJ (opcional), credenciais (senha criptografada).
              </li>
              <li>
                <strong className="text-text-primary">Uso do sistema</strong>: registros de acesso, logs de auditoria,
                horários de ponto, justificativas, escalas e permissões.
              </li>
              <li>
                <strong className="text-text-primary">Dados do dispositivo</strong>: identificadores técnicos
                (ex.: navegador, sistema operacional), endereço IP, data/hora de acesso.
              </li>
              <li>
                <strong className="text-text-primary">Dados biométricos/foto</strong> (se habilitado pela empresa):
                imagens para reconhecimento facial e validações de segurança.
              </li>
              <li>
                <strong className="text-text-primary">Localização</strong> (se habilitado): geolocalização para
                cerca eletrônica/raio permitido.
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              3. Finalidades do tratamento
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>Fornecer o serviço de ponto e gestão (cadastro, autenticação, operação e relatórios).</li>
              <li>Segurança (prevenção a fraudes, auditoria e controle de acesso).</li>
              <li>Melhorias do sistema (telemetria agregada e diagnósticos).</li>
              <li>Suporte e comunicação operacional (ex.: avisos de cobrança, mudanças de status do serviço).</li>
            </ul>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              4. Bases legais
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>
                <strong className="text-text-primary">Execução de contrato</strong> e procedimentos preliminares
                (prestação do serviço).
              </li>
              <li>
                <strong className="text-text-primary">Legítimo interesse</strong> (segurança, auditoria, prevenção
                a fraudes), quando aplicável.
              </li>
              <li>
                <strong className="text-text-primary">Consentimento</strong> (quando exigido, ex.: recursos sensíveis
                habilitados pela empresa).
              </li>
              <li>
                <strong className="text-text-primary">Cumprimento de obrigação legal/regulatória</strong> (ex.: demandas
                trabalhistas e fiscais).
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              5. Compartilhamento
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Podemos compartilhar dados com provedores essenciais (ex.: hospedagem, banco de dados, e-mail transacional),
              sempre com medidas de segurança e finalidade compatível. Não vendemos dados pessoais.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              6. Armazenamento e segurança
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>Criptografia de senha e medidas técnicas/organizacionais de proteção.</li>
              <li>Controle de acesso por papéis (admin/usuário) e trilhas de auditoria.</li>
              <li>Backups e monitoramento para continuidade e integridade do serviço.</li>
            </ul>
          </section>

          {/* 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              7. Retenção
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Mantemos dados pelo período necessário para cumprir as finalidades e obrigações legais.
              Após, descartamos ou anonimizamos quando possível.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              8. Direitos do titular
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Conforme a LGPD, você pode exercer os seguintes direitos:
            </p>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>Confirmação da existência de tratamento de dados pessoais.</li>
              <li>Acesso, correção e atualização de dados incompletos, inexatos ou desatualizados.</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.</li>
              <li>Portabilidade dos dados a outro fornecedor de serviço.</li>
              <li>Informação sobre com quem seus dados são compartilhados.</li>
              <li>Revogação de consentimento, quando aplicável.</li>
            </ul>
            <p className="text-text-secondary leading-relaxed">
              Para exercer seus direitos, entre em contato pelo e-mail indicado na seção 10.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              9. Atualizações desta política
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Podemos atualizar esta política periodicamente. Quando houver mudanças relevantes, informaremos no sistema.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              10. Encarregado (DPO) e contato
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Para solicitações de privacidade e exercício de direitos previstos na LGPD, entre em contato:
            </p>
            <p className="text-text-secondary leading-relaxed">
              <strong className="text-text-primary">E-mail:</strong>{" "}
              <a
                href="mailto:andreworkid@gmail.com"
                className="text-purple-400 hover:text-purple-300 underline underline-offset-4 transition-colors"
              >
                andreworkid@gmail.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-text-faint">
          © {new Date().getFullYear()} WorkID — Tecnologia em Gestão
        </p>
      </div>
    </div>
  );
}
