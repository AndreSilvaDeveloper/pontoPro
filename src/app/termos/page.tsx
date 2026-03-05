// src/app/termos/page.tsx
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Termos de Uso • WorkID",
  description: "Termos de Uso do WorkID.",
};

export default function TermosPage() {
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
            Termos de Uso
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Última atualização: <strong>29/01/2026</strong>
          </p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-surface/80 p-8 shadow-xl backdrop-blur-sm space-y-8">
          {/* Intro */}
          <p className="text-text-secondary leading-relaxed">
            Estes Termos de Uso ("<strong className="text-text-primary">Termos</strong>") regem o acesso e
            utilização do <strong className="text-text-primary">WorkID</strong> ("
            <strong className="text-text-primary">Plataforma</strong>"), um sistema de gestão de ponto e
            rotinas administrativas disponibilizado como serviço (SaaS).
            Ao criar conta, acessar ou utilizar a Plataforma, você declara que leu
            e concorda com estes Termos.
          </p>

          {/* 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              1. Definições
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>
                <strong className="text-text-primary">WorkID</strong>: a Plataforma e seus serviços.
              </li>
              <li>
                <strong className="text-text-primary">Cliente</strong>: empresa contratante da Plataforma.
              </li>
              <li>
                <strong className="text-text-primary">Administrador</strong>: usuário indicado pelo Cliente para gerenciar o sistema.
              </li>
              <li>
                <strong className="text-text-primary">Colaborador/Usuário</strong>: pessoa vinculada ao Cliente que registra ponto e utiliza recursos.
              </li>
            </ul>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              2. Elegibilidade e cadastro
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>O uso corporativo depende de cadastro do Cliente e criação do primeiro Administrador.</li>
              <li>Você se compromete a fornecer informações verdadeiras e mantê-las atualizadas.</li>
              <li>O acesso é pessoal e intransferível. O usuário é responsável por manter sua senha segura.</li>
            </ul>
          </section>

          {/* 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              3. Uso permitido
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Você concorda em utilizar a Plataforma apenas para finalidades lícitas e autorizadas.
            </p>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>É proibido tentar invadir, explorar falhas, burlar controles de acesso ou coletar dados indevidamente.</li>
              <li>É proibido usar a Plataforma para atividades ilegais, fraudulentas ou que violem direitos de terceiros.</li>
              <li>O Cliente é responsável por configurar permissões e orientar seus usuários sobre uso correto.</li>
            </ul>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              4. Funcionalidades e disponibilidade
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
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
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              5. Pagamento, planos e suspensão
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>O uso pode estar sujeito a cobrança conforme plano contratado ou período de teste ("trial").</li>
              <li>Em caso de atraso, o acesso pode ser suspenso até regularização, conforme aviso exibido no sistema.</li>
              <li>Valores, prazos e condições do plano podem ser ajustados com comunicação prévia quando aplicável.</li>
            </ul>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              6. Dados, privacidade e LGPD
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>
                O tratamento de dados pessoais segue a <strong className="text-text-primary">Política de Privacidade</strong>. Leia em{" "}
                <Link
                  href="/privacidade"
                  className="text-purple-400 hover:text-purple-300 underline underline-offset-4 transition-colors"
                >
                  /privacidade
                </Link>
                .
              </li>
              <li>
                Em geral, o Cliente atua como <strong className="text-text-primary">Controlador</strong> dos dados de seus colaboradores,
                e o WorkID como <strong className="text-text-primary">Operador</strong>.
              </li>
              <li>
                O Cliente é responsável por definir bases legais e políticas internas relacionadas a ponto, biometria e geolocalização,
                conforme legislação aplicável.
              </li>
            </ul>
          </section>

          {/* 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              7. Propriedade intelectual
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>A Plataforma, marca, layout, códigos e conteúdos são protegidos por leis de propriedade intelectual.</li>
              <li>O Cliente recebe uma licença limitada, não exclusiva e revogável para uso durante a vigência do contrato/plano.</li>
            </ul>
          </section>

          {/* 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              8. Suporte
            </h2>
            <p className="text-text-secondary leading-relaxed">
              O suporte pode ser oferecido por canais definidos pelo WorkID (ex.: e-mail, WhatsApp, sistema),
              com prazos variáveis conforme o plano e criticidade.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              9. Limitação de responsabilidade
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>O WorkID busca alta disponibilidade e segurança, mas não garante funcionamento ininterrupto.</li>
              <li>
                Não nos responsabilizamos por falhas causadas por internet do usuário, dispositivos, configurações do Cliente,
                ou serviços de terceiros fora do nosso controle.
              </li>
              <li>O Cliente é responsável por validar relatórios e uso do ponto conforme regras internas e legislação.</li>
            </ul>
          </section>

          {/* 10 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              10. Rescisão e encerramento
            </h2>
            <ul className="space-y-2 text-text-secondary leading-relaxed pl-5 list-disc marker:text-purple-400/60">
              <li>O Cliente pode solicitar encerramento conforme regras do plano/contrato.</li>
              <li>Podemos encerrar ou suspender acessos em caso de violação destes Termos, fraude, ou exigência legal.</li>
              <li>
                Após encerramento, dados podem ser retidos pelo período necessário para obrigações legais e/ou por solicitação do Cliente,
                conforme Política de Privacidade.
              </li>
            </ul>
          </section>

          {/* 11 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              11. Alterações destes Termos
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Podemos atualizar estes Termos periodicamente. Mudanças relevantes poderão ser comunicadas dentro do sistema.
              O uso continuado após atualização indica concordância com a versão vigente.
            </p>
          </section>

          {/* 12 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              12. Foro e legislação
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil.
              Fica eleito o foro da comarca do domicílio do Cliente, salvo disposição legal diferente.
            </p>
          </section>

          {/* 13 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-2">
              13. Contato
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Para dúvidas e solicitações:{" "}
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
