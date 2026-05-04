export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  ogImage: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "o-que-e-ponto-digital-como-funciona",
    title: "O que é ponto digital e como funciona na prática",
    description:
      "Entenda o que é ponto digital, como funciona, quais as vantagens para sua empresa e por que ele está substituindo o relógio de ponto tradicional.",
    date: "2026-03-20",
    readTime: "7 min",
    category: "Guia",
    tags: ["ponto digital", "controle de ponto", "RH", "tecnologia"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que é ponto digital?</h2>
      <p>O <strong>ponto digital</strong> é um sistema moderno de registro de jornada de trabalho que substitui os antigos relógios de ponto mecânicos e cartográficos. Em vez de cartões de papel ou crachás físicos, o colaborador registra sua entrada e saída diretamente pelo celular, tablet ou computador — de qualquer lugar.</p>
      <p>Esse tipo de sistema utiliza tecnologias como <strong>GPS</strong>, <strong>reconhecimento facial</strong> e <strong>geolocalização</strong> para garantir que o registro seja feito de forma segura e confiável. Tudo é armazenado na nuvem, permitindo que gestores acompanhem a jornada em tempo real.</p>

      <h2>Como funciona o ponto digital na prática?</h2>
      <p>O funcionamento é simples e intuitivo. Veja o passo a passo:</p>
      <ul>
        <li><strong>Cadastro do colaborador:</strong> O gestor cadastra os funcionários no sistema, definindo horários e regras de jornada.</li>
        <li><strong>Registro de ponto:</strong> O colaborador abre o aplicativo no celular e registra o ponto com um toque. O sistema captura automaticamente a localização GPS e pode solicitar reconhecimento facial.</li>
        <li><strong>Validação automática:</strong> O sistema verifica se o funcionário está dentro da área permitida (cerca virtual) e se a foto confere com o cadastro.</li>
        <li><strong>Painel do gestor:</strong> Todas as informações ficam disponíveis em um dashboard em tempo real, com alertas de atrasos, faltas e horas extras.</li>
        <li><strong>Relatórios e exportação:</strong> No fim do mês, o sistema gera relatórios prontos para o fechamento da folha de pagamento.</li>
      </ul>

      <h2>Quais as vantagens do ponto digital?</h2>
      <p>Migrar para o ponto digital traz uma série de benefícios para empresas de todos os tamanhos:</p>
      <ul>
        <li><strong>Redução de fraudes:</strong> Com GPS e biometria facial, é praticamente impossível registrar ponto por outro colega.</li>
        <li><strong>Economia de tempo:</strong> Elimina a necessidade de conferir cartões de ponto manualmente. O RH economiza horas de trabalho todo mês.</li>
        <li><strong>Conformidade legal:</strong> Atende às exigências da Portaria 671 do MTE, que regulamenta os sistemas eletrônicos de registro de ponto.</li>
        <li><strong>Acesso remoto:</strong> Ideal para equipes externas, home office e empresas com múltiplas unidades.</li>
        <li><strong>Sustentabilidade:</strong> Sem papel, sem cartões plásticos, sem desperdício.</li>
      </ul>

      <h2>Ponto digital é obrigatório?</h2>
      <p>A CLT exige que empresas com mais de 20 funcionários façam o controle de jornada. O ponto digital é uma das formas aceitas pela legislação, desde que o sistema esteja em conformidade com a <a href="/blog/portaria-671-controle-de-ponto"><strong>Portaria 671</strong></a>.</p>
      <p>Mesmo empresas menores podem (e devem) adotar o ponto digital como forma de proteção jurídica e organização interna. Em disputas trabalhistas, ter registros completos e confiáveis faz toda a diferença. Veja também: <a href="/blog/ponto-eletronico-obrigatorio-lei">ponto eletrônico é obrigatório por lei?</a></p>

      <h2>Como escolher um sistema de ponto digital?</h2>
      <p>Na hora de escolher, avalie os seguintes critérios:</p>
      <ul>
        <li><strong>Facilidade de uso:</strong> O sistema precisa ser intuitivo tanto para gestores quanto para colaboradores.</li>
        <li><strong>Segurança:</strong> Busque soluções com GPS, <a href="/blog/reconhecimento-facial-ponto-vale-a-pena">reconhecimento facial</a> e criptografia de dados.</li>
        <li><strong>Conformidade legal:</strong> Verifique se o sistema atende à Portaria 671 e à <a href="/blog/ponto-eletronico-lgpd-o-que-saber">LGPD</a>.</li>
        <li><strong>Suporte:</strong> Ter um time de suporte acessível é fundamental para resolver dúvidas rapidamente.</li>
        <li><strong>Custo-benefício:</strong> Compare planos e funcionalidades. Nem sempre o mais barato é o mais econômico a longo prazo.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>O ponto digital é a evolução natural do controle de jornada. Ele traz mais segurança, praticidade e conformidade legal para sua empresa, além de economizar tempo e dinheiro do departamento de RH.</p>
      <p>Se você busca uma solução moderna e confiável, o <strong>WorkID</strong> oferece ponto digital com GPS, <a href="/blog/reconhecimento-facial-ponto-vale-a-pena">reconhecimento facial</a>, <a href="/blog/banco-de-horas-como-calcular-gerenciar">banco de horas automático</a> e muito mais — tudo em uma plataforma simples e acessível. Precisa migrar do cartão de ponto? Veja como <a href="/blog/como-implantar-ponto-digital-7-dias">implantar ponto digital em 7 dias</a>.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Pronto para modernizar o controle de ponto da sua empresa?</p>
        <p>Teste o WorkID gratuitamente e descubra como é fácil gerenciar a jornada da sua equipe.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "portaria-671-controle-de-ponto",
    title: "Portaria 671: o que muda no controle de ponto da sua empresa",
    description:
      "Saiba tudo sobre a Portaria 671 do MTE: o que exige, como impacta o registro de ponto eletrônico e como adequar sua empresa às novas regras.",
    date: "2026-03-15",
    readTime: "8 min",
    category: "Legislação",
    tags: ["portaria 671", "legislação trabalhista", "ponto eletrônico", "MTE"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que é a Portaria 671?</h2>
      <p>A <strong>Portaria 671</strong>, publicada pelo Ministério do Trabalho e Emprego (MTE) em novembro de 2021, consolidou e atualizou as regras sobre o registro eletrônico de ponto no Brasil. Ela substituiu as antigas Portarias 1510 e 373, unificando a regulamentação em um único documento.</p>
      <p>Essa portaria é fundamental para qualquer empresa que utiliza — ou pretende utilizar — sistemas eletrônicos para controlar a jornada dos seus colaboradores. Entender suas exigências evita multas e problemas em fiscalizações.</p>

      <h2>Quais são os tipos de REP previstos?</h2>
      <p>A Portaria 671 define três categorias de Registrador Eletrônico de Ponto (REP):</p>
      <ul>
        <li><strong>REP-C (Convencional):</strong> É o relógio de ponto físico tradicional, instalado no local de trabalho. Deve emitir comprovante impresso a cada marcação.</li>
        <li><strong>REP-A (Alternativo):</strong> Sistema eletrônico autorizado por convenção ou acordo coletivo. Não exige impressão de comprovante, mas deve atender a requisitos técnicos específicos.</li>
        <li><strong>REP-P (Programa):</strong> Software de registro de ponto via aplicativo ou navegador. É a categoria mais moderna e flexível, ideal para empresas com trabalho remoto ou equipes externas.</li>
      </ul>

      <h2>Principais exigências da Portaria 671</h2>
      <p>Independente do tipo de REP, a portaria estabelece requisitos obrigatórios:</p>
      <ul>
        <li><strong>Inviolabilidade dos registros:</strong> Os dados de ponto não podem ser alterados ou excluídos. O sistema deve manter um registro íntegro e auditável.</li>
        <li><strong>Emissão de comprovante:</strong> O colaborador deve receber comprovação do registro (impresso ou digital, dependendo do tipo de REP).</li>
        <li><strong>Disponibilidade de dados:</strong> O empregador deve disponibilizar os registros de ponto para fiscalização do MTE a qualquer momento.</li>
        <li><strong>Arquivo Fonte de Dados (AFD):</strong> O sistema deve gerar o AFD, arquivo padronizado com todos os registros de ponto.</li>
        <li><strong>Certificação do programa:</strong> Para REP-P, o software deve possuir certificado de registro e atender a padrões técnicos definidos na portaria.</li>
      </ul>

      <h2>O que muda para sua empresa?</h2>
      <p>Se sua empresa ainda usa métodos manuais ou sistemas que não atendem à Portaria 671, é hora de se adequar. As principais mudanças práticas são:</p>
      <ul>
        <li><strong>Fim do ponto manual em papel:</strong> Empresas que usam livro de ponto ou planilhas estão cada vez mais vulneráveis em fiscalizações.</li>
        <li><strong>Necessidade de sistema homologado:</strong> Seu software de ponto precisa atender aos requisitos técnicos da portaria.</li>
        <li><strong>Mais segurança jurídica:</strong> Com um sistema adequado, sua empresa tem respaldo legal completo em reclamações trabalhistas.</li>
        <li><strong>Modernização obrigatória:</strong> A tendência é que fiscalizações se tornem mais rigorosas, especialmente com o avanço do eSocial.</li>
      </ul>

      <h2>Como o REP-P funciona na prática?</h2>
      <p>O REP-P é a opção mais adotada por pequenas e médias empresas atualmente. Funciona assim:</p>
      <ul>
        <li>O colaborador acessa o sistema pelo celular ou computador.</li>
        <li>Registra o ponto com validação por GPS e/ou biometria facial.</li>
        <li>Recebe comprovante digital automaticamente.</li>
        <li>Todos os dados ficam armazenados na nuvem com criptografia.</li>
        <li>O gestor acessa relatórios e faz a gestão em tempo real.</li>
      </ul>

      <h2>Penalidades por descumprimento</h2>
      <p>Empresas que não cumprem as exigências da Portaria 671 podem enfrentar:</p>
      <ul>
        <li>Multas administrativas aplicadas pelo MTE.</li>
        <li>Condenações em ações trabalhistas por falta de controle de jornada adequado.</li>
        <li>Dificuldades no envio de informações ao eSocial.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>A Portaria 671 trouxe mais clareza e modernização ao controle de ponto no Brasil. Adequar-se não é apenas uma obrigação legal — é uma oportunidade de tornar a gestão de pessoas mais eficiente e segura.</p>
      <p>O <strong>WorkID</strong> é um sistema REP-P completo, em total conformidade com a Portaria 671. Com ele, sua empresa registra ponto de forma segura, gera relatórios automáticos e fica protegida legalmente.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Adeque sua empresa à Portaria 671 hoje mesmo</p>
        <p>O WorkID atende a todas as exigências legais do MTE. Comece seu teste grátis agora.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "como-evitar-fraudes-registro-ponto-gps-reconhecimento-facial",
    title:
      "Como evitar fraudes no registro de ponto: GPS e reconhecimento facial",
    description:
      "Descubra como tecnologias como GPS e reconhecimento facial eliminam fraudes no ponto e protegem sua empresa de prejuízos e processos trabalhistas.",
    date: "2026-03-10",
    readTime: "6 min",
    category: "Segurança",
    tags: ["fraude ponto", "GPS", "reconhecimento facial", "segurança"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O problema das fraudes no registro de ponto</h2>
      <p>A <strong>fraude no registro de ponto</strong> é um dos maiores problemas enfrentados por empresas brasileiras. Estima-se que o chamado "buddy punching" — quando um colega registra o ponto por outro — gera prejuízos de milhões de reais por ano no país.</p>
      <p>Além do prejuízo financeiro direto, fraudes no ponto podem causar:</p>
      <ul>
        <li>Pagamento indevido de horas extras.</li>
        <li>Descontrole na gestão de jornada.</li>
        <li>Vulnerabilidade em ações trabalhistas.</li>
        <li>Clima organizacional negativo — funcionários honestos se sentem prejudicados.</li>
      </ul>

      <h2>Tipos mais comuns de fraude no ponto</h2>
      <p>Antes de falar nas soluções, é importante conhecer os golpes mais frequentes:</p>
      <ul>
        <li><strong>Buddy punching:</strong> Um colega registra o ponto pelo outro, cobrindo atrasos ou faltas.</li>
        <li><strong>Marcação fora do local:</strong> O funcionário registra o ponto sem estar no local de trabalho.</li>
        <li><strong>Manipulação de horários:</strong> Alteração de registros no sistema (quando o sistema permite edição).</li>
        <li><strong>Ponto britânico:</strong> Registros sempre nos mesmos horários exatos, indicando marcação automática ou combinada.</li>
      </ul>

      <h2>Como o GPS combate fraudes</h2>
      <p>A <strong>geolocalização por GPS</strong> é a primeira camada de proteção contra fraudes. Quando o colaborador registra o ponto, o sistema captura automaticamente suas coordenadas geográficas e as compara com a localização esperada.</p>
      <p>As principais funcionalidades do GPS no ponto digital incluem:</p>
      <ul>
        <li><strong>Cerca virtual (geofencing):</strong> Define um perímetro ao redor do local de trabalho. O ponto só é aceito se o funcionário estiver dentro dessa área.</li>
        <li><strong>Registro de coordenadas:</strong> Cada marcação armazena latitude e longitude, criando um histórico auditável.</li>
        <li><strong>Alertas em tempo real:</strong> O gestor recebe notificação quando alguém tenta registrar ponto fora da área permitida.</li>
      </ul>

      <h2>Como o reconhecimento facial elimina fraudes</h2>
      <p>O <strong>reconhecimento facial</strong> é a tecnologia mais eficaz contra o buddy punching. Funciona assim:</p>
      <ul>
        <li>No cadastro, o sistema captura a biometria facial do colaborador.</li>
        <li>A cada registro de ponto, o funcionário tira uma selfie pelo aplicativo.</li>
        <li>Um algoritmo de inteligência artificial compara a foto com o cadastro em milissegundos.</li>
        <li>Se não houver correspondência, o registro é bloqueado e o gestor é alertado.</li>
      </ul>
      <p>Essa tecnologia funciona mesmo com mudanças na aparência (barba, óculos, maquiagem) e em diferentes condições de iluminação.</p>

      <h2>A combinação GPS + reconhecimento facial</h2>
      <p>Quando combinadas, essas duas tecnologias criam uma <strong>dupla camada de segurança</strong> praticamente inviolável:</p>
      <ul>
        <li>O GPS garante que a pessoa está no local certo.</li>
        <li>O reconhecimento facial garante que a pessoa certa está registrando.</li>
        <li>Juntas, eliminam mais de 99% das tentativas de fraude.</li>
      </ul>

      <h2>Benefícios para a empresa</h2>
      <p>Adotar um sistema antifraude traz resultados imediatos:</p>
      <ul>
        <li><strong>Redução de custos:</strong> Elimina pagamentos indevidos de horas extras e salários.</li>
        <li><strong>Segurança jurídica:</strong> Registros confiáveis e auditáveis protegem em processos trabalhistas.</li>
        <li><strong>Cultura de responsabilidade:</strong> Quando todos sabem que o sistema é seguro, a pontualidade melhora naturalmente.</li>
        <li><strong>Gestão mais eficiente:</strong> Dados precisos permitem decisões melhores sobre escalas e produtividade.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>Fraudes no ponto são um problema sério, mas totalmente evitável com a tecnologia certa. GPS e reconhecimento facial são as ferramentas mais eficazes disponíveis hoje para proteger sua empresa.</p>
      <p>O <strong>WorkID</strong> combina GPS com cerca virtual e reconhecimento facial com IA para garantir registros 100% confiáveis. Proteja sua empresa agora.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Elimine fraudes no ponto da sua empresa</p>
        <p>Teste o WorkID com GPS e reconhecimento facial gratuitamente por 14 dias.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "banco-de-horas-como-calcular-gerenciar",
    title: "Banco de horas: como calcular e gerenciar corretamente",
    description:
      "Aprenda como funciona o banco de horas, como calcular o saldo, o que diz a CLT e como um sistema digital simplifica a gestão de horas extras.",
    date: "2026-03-05",
    readTime: "7 min",
    category: "Gestão",
    tags: ["banco de horas", "horas extras", "CLT", "gestão de jornada"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que é banco de horas?</h2>
      <p>O <strong>banco de horas</strong> é um sistema de compensação de jornada previsto na CLT que permite que horas trabalhadas a mais em um dia sejam compensadas com folgas ou saídas antecipadas em outro momento, sem o pagamento de horas extras.</p>
      <p>Em vez de pagar adicional financeiro por cada hora extra, a empresa "credita" essas horas no banco do funcionário, que posteriormente as utiliza como tempo de descanso.</p>

      <h2>O que diz a lei sobre banco de horas?</h2>
      <p>A Reforma Trabalhista de 2017 trouxe mudanças importantes para o banco de horas:</p>
      <ul>
        <li><strong>Acordo individual:</strong> Pode ser firmado diretamente entre empregado e empregador, por escrito, com prazo de compensação de até 6 meses.</li>
        <li><strong>Convenção coletiva:</strong> Quando previsto em acordo ou convenção coletiva, o prazo de compensação pode ser de até 12 meses.</li>
        <li><strong>Compensação no mesmo mês:</strong> A jornada pode ser compensada no mesmo mês por acordo individual tácito ou escrito.</li>
        <li><strong>Limite diário:</strong> A jornada não pode ultrapassar 10 horas diárias, salvo exceções legais.</li>
      </ul>

      <h2>Como calcular o banco de horas</h2>
      <p>O cálculo do banco de horas segue uma lógica simples, mas exige atenção:</p>

      <h3>Horas positivas (crédito)</h3>
      <p>Quando o funcionário trabalha além da jornada contratada, as horas excedentes são creditadas no banco:</p>
      <ul>
        <li>Jornada contratada: 8 horas/dia</li>
        <li>Horas trabalhadas: 9 horas</li>
        <li>Saldo: +1 hora no banco</li>
      </ul>

      <h3>Horas negativas (débito)</h3>
      <p>Quando o funcionário trabalha menos que o previsto, o saldo é debitado:</p>
      <ul>
        <li>Jornada contratada: 8 horas/dia</li>
        <li>Horas trabalhadas: 7 horas</li>
        <li>Saldo: -1 hora no banco</li>
      </ul>

      <h3>Atenção aos domingos e feriados</h3>
      <p>Horas trabalhadas em domingos e feriados, quando não há previsão de escala, geralmente entram no banco com fator de multiplicação (1,5x ou 2x, conforme convenção coletiva). Fique atento ao que determina o acordo da categoria.</p>

      <h2>Erros comuns na gestão do banco de horas</h2>
      <ul>
        <li><strong>Não registrar as horas corretamente:</strong> Sem um controle preciso, é impossível gerenciar o banco de forma justa.</li>
        <li><strong>Ultrapassar o prazo de compensação:</strong> Se as horas não forem compensadas no prazo legal, devem ser pagas como horas extras com adicional.</li>
        <li><strong>Não comunicar o saldo:</strong> O funcionário tem direito de saber seu saldo atualizado a qualquer momento.</li>
        <li><strong>Acumular muitas horas:</strong> Um banco com saldo muito alto indica problemas de gestão e pode gerar passivos trabalhistas.</li>
      </ul>

      <h2>Como um sistema digital facilita a gestão</h2>
      <p>Gerenciar banco de horas manualmente com planilhas é trabalhoso e propenso a erros. Um sistema digital resolve isso automaticamente:</p>
      <ul>
        <li><strong>Cálculo automático:</strong> O sistema calcula o saldo em tempo real, considerando jornada, intervalos e regras da empresa.</li>
        <li><strong>Transparência:</strong> Funcionários consultam seu próprio saldo pelo aplicativo, a qualquer momento.</li>
        <li><strong>Alertas:</strong> O gestor recebe avisos quando saldos estão altos ou perto do vencimento.</li>
        <li><strong>Relatórios:</strong> Exportação de dados pronta para auditoria ou fechamento de folha.</li>
        <li><strong>Conformidade:</strong> O sistema segue automaticamente as regras da CLT e da convenção coletiva configurada.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>O banco de horas é uma ferramenta poderosa para flexibilizar a jornada de trabalho, mas exige controle rigoroso para funcionar corretamente e evitar problemas legais.</p>
      <p>O <strong>WorkID</strong> automatiza todo o cálculo e gestão do banco de horas, dando visibilidade ao gestor e ao colaborador em tempo real. Simplifique a gestão de jornada da sua empresa.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Automatize o banco de horas da sua empresa</p>
        <p>Com o WorkID, o cálculo é automático e em tempo real. Teste grátis agora.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "ponto-eletronico-pequenas-empresas-guia-completo",
    title: "Ponto eletrônico para pequenas empresas: guia completo",
    description:
      "Guia completo sobre ponto eletrônico para pequenas empresas: quando é obrigatório, como escolher o melhor sistema e quanto custa implementar.",
    date: "2026-02-28",
    readTime: "8 min",
    category: "Guia",
    tags: [
      "ponto eletrônico",
      "pequena empresa",
      "MEI",
      "controle de jornada",
    ],
    ogImage: "/images/og-image.png",
    content: `
      <h2>Ponto eletrônico é obrigatório para pequenas empresas?</h2>
      <p>Segundo o artigo 74 da CLT, empresas com mais de 20 funcionários são obrigadas a manter um sistema de controle de jornada. Mas isso não significa que empresas menores devam ignorar esse controle.</p>
      <p>Na prática, adotar um <strong>ponto eletrônico</strong> mesmo com poucos funcionários traz benefícios enormes:</p>
      <ul>
        <li><strong>Proteção em processos trabalhistas:</strong> Sem registros, a palavra do funcionário tende a prevalecer na Justiça do Trabalho.</li>
        <li><strong>Organização interna:</strong> Saber exatamente quem trabalhou quando evita conflitos e facilita a gestão.</li>
        <li><strong>Preparação para crescimento:</strong> Quando a empresa crescer, o sistema já estará implementado.</li>
        <li><strong>Gestão de horas extras:</strong> Controle preciso evita pagamentos indevidos que pesam no caixa de empresas pequenas.</li>
      </ul>

      <h2>Tipos de ponto eletrônico disponíveis</h2>
      <p>Existem diferentes opções no mercado, cada uma com suas características:</p>

      <h3>Relógio de ponto físico (REP-C)</h3>
      <p>Equipamento instalado na empresa que registra o ponto por biometria digital, cartão ou senha. Custa entre R$ 1.500 e R$ 5.000 no equipamento, mais mensalidade do software.</p>
      <ul>
        <li>Vantagem: registro presencial obrigatório.</li>
        <li>Desvantagem: alto custo inicial, manutenção necessária, não funciona para trabalho remoto.</li>
      </ul>

      <h3>Aplicativo de ponto (REP-P)</h3>
      <p>Sistema baseado em software, acessível pelo celular ou computador. É a opção mais moderna e com melhor custo-benefício para pequenas empresas.</p>
      <ul>
        <li>Vantagem: baixo custo, fácil implementação, funciona em qualquer lugar.</li>
        <li>Desvantagem: depende de internet no celular do funcionário.</li>
      </ul>

      <h3>Ponto por planilha</h3>
      <p>Algumas empresas ainda usam planilhas Excel ou até cadernos. Embora seja melhor que nada, esse método é extremamente frágil e difícil de defender em juízo.</p>

      <h2>Como escolher o melhor sistema para sua empresa</h2>
      <p>Para pequenas empresas, os critérios mais importantes são:</p>
      <ul>
        <li><strong>Preço acessível:</strong> Busque planos por funcionário, sem taxa de adesão ou fidelidade.</li>
        <li><strong>Sem necessidade de equipamento:</strong> Sistemas que funcionam no celular eliminam o investimento inicial em hardware.</li>
        <li><strong>Facilidade de uso:</strong> Com equipe reduzida, não dá para perder tempo com treinamentos longos.</li>
        <li><strong>Cálculo automático:</strong> Horas extras, banco de horas e atrasos calculados automaticamente economizam horas do RH (ou do próprio dono).</li>
        <li><strong>Suporte humanizado:</strong> Em empresas pequenas, quem cuida do ponto geralmente é o próprio dono ou administrador. Ter suporte acessível é essencial.</li>
      </ul>

      <h2>Quanto custa um ponto eletrônico digital?</h2>
      <p>Os valores variam bastante no mercado. Uma referência para 2026:</p>
      <ul>
        <li><strong>Sistemas básicos:</strong> R$ 2 a R$ 5 por funcionário/mês</li>
        <li><strong>Sistemas intermediários:</strong> R$ 5 a R$ 15 por funcionário/mês (com GPS, fotos e relatórios)</li>
        <li><strong>Sistemas completos:</strong> R$ 15 a R$ 30 por funcionário/mês (com reconhecimento facial, banco de horas, integração com folha)</li>
      </ul>
      <p>Para uma empresa com 10 funcionários, o investimento pode ser menor que R$ 150/mês — muito menos do que o custo de um único processo trabalhista perdido.</p>

      <h2>Passo a passo para implementar</h2>
      <ul>
        <li><strong>1. Escolha o sistema:</strong> Avalie as opções e faça testes gratuitos.</li>
        <li><strong>2. Configure a empresa:</strong> Cadastre horários, jornadas e regras.</li>
        <li><strong>3. Cadastre os funcionários:</strong> Inclua dados e faça o registro facial, se disponível.</li>
        <li><strong>4. Comunique a equipe:</strong> Explique como funciona e tire dúvidas.</li>
        <li><strong>5. Acompanhe os primeiros dias:</strong> Verifique se todos estão registrando corretamente.</li>
        <li><strong>6. Ajuste e otimize:</strong> Configure alertas e relatórios conforme a necessidade.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>O ponto eletrônico digital é acessível, fácil de implementar e essencial para qualquer pequena empresa que queira se proteger legalmente e gerenciar melhor sua equipe.</p>
      <p>O <strong>WorkID</strong> foi criado pensando em pequenas e médias empresas. Com planos acessíveis, implementação em minutos e suporte dedicado, é a solução ideal para quem está começando.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Comece a controlar o ponto da sua empresa hoje</p>
        <p>Crie sua conta grátis no WorkID em menos de 2 minutos. Sem cartão de crédito.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "como-calcular-hora-extra-clt",
    title: "Como calcular hora extra: guia completo CLT 2026",
    description:
      "Aprenda como calcular hora extra corretamente segundo a CLT: adicional de 50%, hora extra noturna, banco de horas e exemplos práticos para sua empresa.",
    date: "2026-03-20",
    readTime: "8 min",
    category: "Guia Prático",
    tags: ["hora extra", "CLT", "cálculo trabalhista", "folha de pagamento", "jornada de trabalho"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que é hora extra segundo a CLT?</h2>
      <p>A <strong>hora extra</strong> é todo período trabalhado além da jornada normal do colaborador, conforme definido no contrato de trabalho ou na Consolidação das Leis do Trabalho (CLT). No Brasil, a jornada padrão é de <strong>8 horas diárias</strong> e <strong>44 horas semanais</strong>.</p>
      <p>Quando o funcionário excede esse limite, o empregador deve pagar as horas adicionais com acréscimo ou compensá-las por meio de banco de horas, respeitando as regras legais.</p>

      <h2>Qual o adicional de hora extra previsto na CLT?</h2>
      <p>A Constituição Federal e a CLT estabelecem os seguintes percentuais mínimos de adicional:</p>
      <ul>
        <li><strong>Dias úteis:</strong> adicional de no mínimo <strong>50%</strong> sobre o valor da hora normal.</li>
        <li><strong>Domingos e feriados:</strong> adicional de <strong>100%</strong> sobre o valor da hora normal.</li>
        <li><strong>Convenção coletiva:</strong> alguns sindicatos estabelecem percentuais maiores — sempre verifique o acordo da categoria.</li>
      </ul>
      <p>Importante: o limite legal é de <strong>2 horas extras por dia</strong>, salvo em casos excepcionais previstos em lei (art. 59 da CLT).</p>

      <h2>Como calcular o valor da hora extra: passo a passo</h2>
      <p>Veja o cálculo completo com um exemplo prático:</p>

      <h3>1. Calcule o valor da hora normal</h3>
      <p>Divida o salário mensal pelo número de horas trabalhadas no mês:</p>
      <ul>
        <li>Salário: R$ 3.000,00</li>
        <li>Jornada: 220 horas/mês (padrão CLT para 44h semanais)</li>
        <li><strong>Hora normal:</strong> R$ 3.000 ÷ 220 = R$ 13,64</li>
      </ul>

      <h3>2. Aplique o adicional de 50%</h3>
      <ul>
        <li>Hora normal: R$ 13,64</li>
        <li>Adicional de 50%: R$ 13,64 × 0,50 = R$ 6,82</li>
        <li><strong>Valor da hora extra:</strong> R$ 13,64 + R$ 6,82 = <strong>R$ 20,46</strong></li>
      </ul>

      <h3>3. Multiplique pelo número de horas extras</h3>
      <ul>
        <li>Se o funcionário fez 10 horas extras no mês:</li>
        <li><strong>Total:</strong> 10 × R$ 20,46 = <strong>R$ 204,60</strong></li>
      </ul>

      <h2>Hora extra noturna: como funciona?</h2>
      <p>O trabalho noturno (entre 22h e 5h) já possui um <strong>adicional noturno de 20%</strong> sobre a hora normal. Quando há hora extra no período noturno, os dois adicionais se acumulam:</p>
      <ul>
        <li>Hora normal: R$ 13,64</li>
        <li>Adicional noturno (20%): R$ 13,64 × 1,20 = R$ 16,37</li>
        <li>Hora extra noturna (50% sobre a hora noturna): R$ 16,37 × 1,50 = <strong>R$ 24,55</strong></li>
      </ul>
      <p>Além disso, a hora noturna é <strong>reduzida</strong>: cada hora noturna equivale a 52 minutos e 30 segundos, o que aumenta ainda mais o custo para o empregador.</p>

      <h2>Hora extra e banco de horas: qual a diferença?</h2>
      <p>O <strong>banco de horas</strong> é uma alternativa ao pagamento financeiro da hora extra. Em vez de pagar, a empresa compensa o tempo com folgas:</p>
      <ul>
        <li><strong>Acordo individual escrito:</strong> compensação em até 6 meses.</li>
        <li><strong>Acordo coletivo:</strong> compensação em até 12 meses.</li>
        <li><strong>Compensação no mesmo mês:</strong> acordo tácito ou escrito.</li>
      </ul>
      <p>Se as horas não forem compensadas dentro do prazo, devem ser pagas como hora extra com o adicional legal.</p>

      <h2>Reflexos da hora extra em outros direitos</h2>
      <p>As horas extras habituais geram reflexos em diversas verbas trabalhistas:</p>
      <ul>
        <li><strong>13º salário:</strong> a média das horas extras integra o cálculo.</li>
        <li><strong>Férias + 1/3:</strong> a média das horas extras habituais é incluída.</li>
        <li><strong>FGTS:</strong> o valor das horas extras compõe a base de cálculo do FGTS (8%).</li>
        <li><strong>DSR (Descanso Semanal Remunerado):</strong> horas extras refletem no cálculo do DSR.</li>
        <li><strong>Aviso prévio e verbas rescisórias:</strong> horas extras habituais são consideradas.</li>
      </ul>

      <h2>Erros comuns no cálculo de hora extra</h2>
      <ul>
        <li><strong>Não considerar reflexos:</strong> muitas empresas calculam apenas o valor direto e esquecem os reflexos em férias, 13º e FGTS.</li>
        <li><strong>Ignorar a convenção coletiva:</strong> percentuais de adicional podem ser maiores que os 50% da CLT.</li>
        <li><strong>Controle manual falho:</strong> planilhas e anotações em papel frequentemente contêm erros que geram passivos trabalhistas.</li>
        <li><strong>Não registrar corretamente os minutos:</strong> arredondamentos incorretos prejudicam o funcionário e podem gerar processos.</li>
      </ul>

      <h2>Como automatizar o cálculo de hora extra</h2>
      <p>A melhor forma de evitar erros e economizar tempo é utilizar um <strong>sistema digital de controle de ponto</strong> que calcule as horas extras automaticamente. Com o <strong>WorkID</strong>, você tem:</p>
      <ul>
        <li>Registro de ponto preciso com GPS e reconhecimento facial.</li>
        <li>Cálculo automático de horas extras, banco de horas e adicional noturno.</li>
        <li>Relatórios prontos para o fechamento da folha de pagamento.</li>
        <li>Conformidade total com a CLT e a Portaria 671.</li>
      </ul>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Automatize o cálculo de horas extras da sua empresa</p>
        <p>Com o WorkID, o cálculo é preciso, automático e em conformidade com a CLT. Teste grátis agora.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "ponto-eletronico-obrigatorio-lei",
    title: "Ponto eletrônico é obrigatório? O que diz a lei",
    description:
      "Descubra se o ponto eletrônico é obrigatório para sua empresa, o que diz o artigo 74 da CLT, a Portaria 671 e quais as penalidades para quem descumpre a lei.",
    date: "2026-03-18",
    readTime: "7 min",
    category: "Legislação",
    tags: ["ponto eletrônico", "CLT", "Portaria 671", "legislação trabalhista", "obrigatoriedade"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>Afinal, ponto eletrônico é obrigatório?</h2>
      <p>Essa é uma das dúvidas mais comuns entre donos de pequenas e médias empresas no Brasil. A resposta curta é: <strong>depende do número de funcionários</strong>. Mas mesmo quando não é obrigatório, ter um sistema de controle de ponto é altamente recomendado.</p>
      <p>Vamos analisar o que diz a legislação brasileira e entender exatamente quem precisa adotar o ponto eletrônico.</p>

      <h2>O que diz o artigo 74 da CLT?</h2>
      <p>O <strong>artigo 74 da CLT</strong> é o principal dispositivo legal sobre controle de jornada no Brasil. Ele foi atualizado pela Lei da Liberdade Econômica (Lei 13.874/2019) e estabelece:</p>
      <ul>
        <li><strong>Empresas com mais de 20 funcionários</strong> são obrigadas a manter um sistema de registro de ponto — seja ele manual, mecânico ou eletrônico.</li>
        <li>Antes da reforma, o limite era de 10 funcionários. A mudança aliviou micro e pequenas empresas.</li>
        <li>O registro deve conter <strong>horário de entrada, saída e intervalos</strong> de cada colaborador.</li>
      </ul>
      <p>Importante: a lei não especifica que o sistema precisa ser eletrônico. Empresas podem usar registro manual (livro de ponto) ou mecânico (relógio cartográfico). Porém, o <strong>ponto eletrônico digital</strong> é a opção mais segura e eficiente disponível hoje.</p>

      <h2>O que é a Portaria 671 e como ela se aplica?</h2>
      <p>A <strong>Portaria 671 do MTE</strong> (Ministério do Trabalho e Emprego), publicada em 2021, regulamenta especificamente os sistemas eletrônicos de registro de ponto. Ela define três tipos de REP (Registrador Eletrônico de Ponto):</p>
      <ul>
        <li><strong>REP-C (Convencional):</strong> relógio de ponto físico, com impressão de comprovante.</li>
        <li><strong>REP-A (Alternativo):</strong> sistema autorizado por convenção coletiva, sem necessidade de comprovante impresso.</li>
        <li><strong>REP-P (Programa):</strong> aplicativo ou software de ponto — a opção mais moderna e acessível.</li>
      </ul>
      <p>Se sua empresa opta pelo ponto eletrônico, deve obrigatoriamente seguir as regras da Portaria 671, incluindo:</p>
      <ul>
        <li>Inviolabilidade dos registros (não pode alterar ou excluir marcações).</li>
        <li>Geração do Arquivo Fonte de Dados (AFD) para fiscalização.</li>
        <li>Emissão de comprovante ao colaborador (impresso ou digital).</li>
        <li>Disponibilidade dos dados para auditoria pelo MTE.</li>
      </ul>

      <h2>Empresas com menos de 20 funcionários precisam de ponto?</h2>
      <p>Legalmente, <strong>não são obrigadas</strong>. Porém, especialistas em direito trabalhista são unânimes em recomendar o controle de jornada para empresas de qualquer tamanho. Os motivos são claros:</p>
      <ul>
        <li><strong>Proteção em processos trabalhistas:</strong> sem registros de ponto, a empresa tem enorme dificuldade de se defender contra reclamações de horas extras não pagas. Na Justiça do Trabalho, a ausência de controle geralmente favorece o funcionário.</li>
        <li><strong>Controle financeiro:</strong> horas extras não monitoradas geram custos invisíveis que comprometem o caixa da empresa.</li>
        <li><strong>Organização operacional:</strong> saber quem trabalhou quando, por quanto tempo e onde facilita a gestão do dia a dia.</li>
        <li><strong>Preparação para crescimento:</strong> quando a empresa ultrapassar os 20 funcionários, o sistema já estará rodando.</li>
      </ul>

      <h2>Quais as penalidades para quem não cumpre a lei?</h2>
      <p>Empresas obrigadas que não mantêm registro de ponto adequado podem sofrer:</p>
      <ul>
        <li><strong>Multas administrativas:</strong> aplicadas pelo MTE durante fiscalizações. Os valores variam conforme a gravidade e reincidência, podendo chegar a milhares de reais por infração.</li>
        <li><strong>Condenações trabalhistas:</strong> em processos judiciais, a falta de registros confiáveis é usada contra o empregador. O juiz pode presumir como verdadeiras as horas extras alegadas pelo ex-funcionário.</li>
        <li><strong>Problemas com o eSocial:</strong> o sistema exige informações precisas sobre jornada. Dados inconsistentes geram notificações e podem travar processos de folha de pagamento.</li>
        <li><strong>Dano à reputação:</strong> empresas autuadas pelo MTE podem ter a informação publicada, afetando a imagem da marca.</li>
      </ul>

      <h2>Como se adequar de forma simples e econômica</h2>
      <p>A boa notícia é que adequar sua empresa ao controle de ponto eletrônico nunca foi tão fácil e acessível. Com um sistema REP-P como o <strong>WorkID</strong>, você:</p>
      <ul>
        <li>Implementa em minutos, sem necessidade de equipamentos físicos.</li>
        <li>Garante conformidade com a CLT e a Portaria 671.</li>
        <li>Oferece registro de ponto pelo celular com GPS e reconhecimento facial.</li>
        <li>Acessa relatórios automáticos para fechamento de folha e fiscalização.</li>
        <li>Paga valores acessíveis por funcionário, sem taxa de adesão.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>O ponto eletrônico é obrigatório para empresas com mais de 20 funcionários, mas é uma decisão inteligente para qualquer negócio. A combinação de proteção jurídica, economia financeira e organização operacional torna o investimento altamente rentável.</p>
      <p>Não espere uma fiscalização ou um processo trabalhista para agir. Proteja sua empresa agora com o <strong>WorkID</strong>.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Adeque sua empresa à legislação trabalhista</p>
        <p>O WorkID é um sistema REP-P em conformidade com a Portaria 671. Teste grátis por 14 dias.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "home-office-controle-ponto-remoto",
    title: "Home office: como controlar o ponto de funcionários remotos",
    description:
      "Saiba como fazer o controle de ponto no home office de forma legal e eficiente: desafios, soluções tecnológicas, GPS e conformidade com a CLT.",
    date: "2026-03-15",
    readTime: "7 min",
    category: "Gestão",
    tags: ["home office", "trabalho remoto", "controle de ponto", "teletrabalho", "gestão de equipe"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O desafio do controle de ponto no home office</h2>
      <p>O <strong>trabalho remoto</strong> se consolidou como realidade para milhões de brasileiros. Segundo pesquisas recentes, mais de 30% das empresas brasileiras adotam algum modelo de home office ou trabalho híbrido em 2026.</p>
      <p>Com isso, surgiu um grande desafio para os gestores: <strong>como controlar a jornada de quem trabalha de casa?</strong> O relógio de ponto na parede do escritório não funciona mais. Mas a obrigação legal de registrar a jornada continua.</p>

      <h2>O que diz a lei sobre ponto no trabalho remoto?</h2>
      <p>A Reforma Trabalhista de 2017 e a Lei 14.442/2022 trouxeram regulamentação específica para o teletrabalho:</p>
      <ul>
        <li><strong>Teletrabalho por tarefa:</strong> quando o funcionário é contratado por tarefa (e não por jornada), a empresa não é obrigada a controlar o ponto. Porém, isso deve estar explícito no contrato.</li>
        <li><strong>Teletrabalho por jornada:</strong> quando há controle de horário, a empresa <strong>deve registrar a jornada</strong> normalmente, assim como faria no trabalho presencial.</li>
        <li><strong>Modelo híbrido:</strong> funcionários que alternam entre escritório e home office precisam de registro de ponto em ambos os ambientes.</li>
      </ul>
      <p>Na prática, a maioria das empresas opta pelo teletrabalho com controle de jornada, o que torna o sistema de ponto digital essencial.</p>

      <h2>Por que planilhas e confiança não bastam?</h2>
      <p>Muitas empresas tentam controlar o ponto remoto com planilhas preenchidas pelo próprio funcionário ou simplesmente confiam que todos estão cumprindo o horário. Essa abordagem traz sérios problemas:</p>
      <ul>
        <li><strong>Falta de prova legal:</strong> planilhas autopreenchidas têm pouco valor em processos trabalhistas.</li>
        <li><strong>Horas extras descontroladas:</strong> sem registro, o funcionário pode alegar horas extras que a empresa não consegue contestar.</li>
        <li><strong>Produtividade incerta:</strong> sem dados de jornada, fica impossível avaliar a produtividade da equipe remota.</li>
        <li><strong>Burnout invisível:</strong> sem monitoramento, funcionários podem estar trabalhando muito além da jornada sem que o gestor perceba.</li>
      </ul>

      <h2>Soluções tecnológicas para controle de ponto remoto</h2>
      <p>A tecnologia oferece ferramentas eficientes para resolver esse desafio sem invadir a privacidade do colaborador:</p>

      <h3>Aplicativo de ponto com GPS</h3>
      <p>O funcionário registra o ponto pelo celular, e o sistema captura a localização via GPS. Isso não significa rastrear o funcionário o dia inteiro — apenas no momento da marcação.</p>
      <ul>
        <li>Confirma que o registro foi feito do endereço declarado como local de trabalho remoto.</li>
        <li>Permite configurar múltiplos endereços válidos (casa, coworking, etc.).</li>
        <li>Registro é rápido: leva segundos para marcar o ponto.</li>
      </ul>

      <h3>Reconhecimento facial</h3>
      <p>Uma selfie no momento do registro garante que a pessoa certa está marcando o ponto. Combinado com GPS, cria uma camada dupla de segurança.</p>

      <h3>Cerca virtual flexível</h3>
      <p>Em vez de limitar o registro a um único endereço, o sistema pode aceitar marcações em um raio definido ou em múltiplos locais cadastrados — ideal para quem trabalha em diferentes ambientes.</p>

      <h2>Como implementar o controle de ponto remoto na sua empresa</h2>
      <p>Siga este passo a passo para uma transição suave:</p>
      <ul>
        <li><strong>1. Defina a política de trabalho remoto:</strong> estabeleça regras claras sobre horários, intervalos e local de trabalho.</li>
        <li><strong>2. Escolha um sistema de ponto digital:</strong> opte por uma solução que funcione no celular, com GPS e reconhecimento facial.</li>
        <li><strong>3. Cadastre os endereços remotos:</strong> registre o endereço de home office de cada colaborador no sistema.</li>
        <li><strong>4. Comunique a equipe:</strong> explique como o sistema funciona, por que está sendo adotado e como preserva a privacidade.</li>
        <li><strong>5. Treine e acompanhe:</strong> nos primeiros dias, monitore se todos estão utilizando corretamente e tire dúvidas.</li>
        <li><strong>6. Analise os dados:</strong> use os relatórios para identificar padrões, ajustar jornadas e prevenir excesso de trabalho.</li>
      </ul>

      <h2>Confiança e tecnologia: o equilíbrio certo</h2>
      <p>Controlar o ponto no home office <strong>não significa desconfiar</strong> da equipe. Pelo contrário: um sistema transparente protege tanto a empresa quanto o funcionário. O colaborador tem registro comprovado das horas trabalhadas, e a empresa tem segurança jurídica e dados para gestão.</p>
      <p>A chave está em escolher uma ferramenta que seja <strong>simples, rápida e não invasiva</strong> — que registre o ponto em segundos sem monitorar a tela ou a atividade do funcionário durante o dia.</p>

      <h2>Conclusão</h2>
      <p>O home office veio para ficar, e o controle de ponto precisa acompanhar essa evolução. Com as ferramentas certas, é possível manter a conformidade legal, proteger a empresa e respeitar a autonomia dos colaboradores.</p>
      <p>O <strong>WorkID</strong> foi projetado para equipes remotas e híbridas. Com registro de ponto pelo celular, GPS, reconhecimento facial e relatórios em tempo real, sua empresa controla a jornada de qualquer lugar.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Controle o ponto da sua equipe remota com facilidade</p>
        <p>O WorkID funciona de qualquer lugar. Teste grátis e veja como é simples gerenciar equipes remotas.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "dsr-descanso-semanal-remunerado-como-calcular",
    title: "DSR: o que é descanso semanal remunerado e como calcular",
    description:
      "Entenda o que é o DSR (Descanso Semanal Remunerado), quem tem direito, como calcular corretamente e qual o impacto das faltas e horas extras no cálculo.",
    date: "2026-03-12",
    readTime: "7 min",
    category: "Guia Prático",
    tags: ["DSR", "descanso semanal remunerado", "cálculo trabalhista", "CLT", "folha de pagamento"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que é o DSR (Descanso Semanal Remunerado)?</h2>
      <p>O <strong>DSR — Descanso Semanal Remunerado</strong> — é um direito garantido pela Constituição Federal (art. 7º, XV) e regulamentado pela Lei 605/1949. Ele assegura ao trabalhador um dia de descanso por semana, <strong>preferencialmente aos domingos</strong>, sem desconto no salário.</p>
      <p>Para trabalhadores mensalistas, o DSR já está embutido no salário mensal. Porém, para horistas e comissionistas, o cálculo é feito separadamente — e é aí que surgem as dúvidas mais frequentes.</p>

      <h2>Quem tem direito ao DSR?</h2>
      <p>Todo trabalhador com carteira assinada tem direito ao DSR, incluindo:</p>
      <ul>
        <li><strong>Mensalistas:</strong> o DSR já está incluso no salário. Porém, o reflexo das horas extras no DSR deve ser calculado à parte.</li>
        <li><strong>Horistas:</strong> recebem o DSR calculado separadamente, proporcional às horas trabalhadas na semana.</li>
        <li><strong>Comissionistas:</strong> recebem o DSR calculado sobre o total de comissões do mês.</li>
        <li><strong>Trabalhadores avulsos:</strong> também têm direito ao DSR.</li>
      </ul>
      <p><strong>Condição para receber:</strong> o trabalhador deve ter cumprido integralmente a jornada da semana, sem faltas injustificadas ou atrasos. Faltas sem justificativa autorizam o desconto do DSR da semana correspondente.</p>

      <h2>Como calcular o DSR para horistas</h2>
      <p>O cálculo do DSR para trabalhadores horistas segue esta fórmula:</p>
      <ul>
        <li><strong>Fórmula:</strong> (Total de horas normais no mês ÷ Dias úteis do mês) × Domingos e feriados do mês × Valor da hora</li>
      </ul>

      <h3>Exemplo prático</h3>
      <ul>
        <li>Horas normais trabalhadas no mês: 176 horas</li>
        <li>Dias úteis no mês: 22</li>
        <li>Domingos e feriados no mês: 8</li>
        <li>Valor da hora: R$ 15,00</li>
      </ul>
      <p><strong>Cálculo:</strong> (176 ÷ 22) × 8 × R$ 15,00 = 8 × 8 × R$ 15,00 = <strong>R$ 960,00</strong></p>

      <h2>Como calcular o DSR sobre horas extras</h2>
      <p>Este é o cálculo que mais gera dúvidas. Quando o funcionário faz horas extras, o valor dessas horas deve refletir no DSR. A fórmula é:</p>
      <ul>
        <li><strong>Fórmula:</strong> (Valor total das horas extras no mês ÷ Dias úteis do mês) × Domingos e feriados do mês</li>
      </ul>

      <h3>Exemplo prático</h3>
      <ul>
        <li>Total de horas extras no mês: R$ 400,00</li>
        <li>Dias úteis no mês: 22</li>
        <li>Domingos e feriados no mês: 8</li>
      </ul>
      <p><strong>Cálculo:</strong> (R$ 400,00 ÷ 22) × 8 = R$ 18,18 × 8 = <strong>R$ 145,45</strong></p>
      <p>Ou seja, além dos R$ 400,00 de hora extra, o funcionário recebe mais R$ 145,45 de reflexo no DSR.</p>

      <h2>Como calcular o DSR para comissionistas</h2>
      <p>Para trabalhadores que recebem comissão, o DSR é calculado sobre o total de comissões do mês:</p>
      <ul>
        <li><strong>Fórmula:</strong> (Total de comissões no mês ÷ Dias úteis do mês) × Domingos e feriados do mês</li>
      </ul>

      <h3>Exemplo prático</h3>
      <ul>
        <li>Total de comissões: R$ 3.000,00</li>
        <li>Dias úteis: 22</li>
        <li>Domingos e feriados: 8</li>
      </ul>
      <p><strong>Cálculo:</strong> (R$ 3.000 ÷ 22) × 8 = <strong>R$ 1.090,91</strong></p>

      <h2>Impacto das faltas no DSR</h2>
      <p>As faltas injustificadas afetam diretamente o DSR:</p>
      <ul>
        <li><strong>Falta injustificada:</strong> o empregador pode descontar o DSR da semana em que ocorreu a falta.</li>
        <li><strong>Falta justificada:</strong> atestado médico, falecimento de familiar, casamento e outros motivos previstos no art. 473 da CLT não geram perda do DSR.</li>
        <li><strong>Atrasos:</strong> atrasos frequentes e significativos também podem justificar o desconto, dependendo da política da empresa e da convenção coletiva.</li>
      </ul>
      <p>Atenção: a perda do DSR se refere à <strong>semana da falta</strong>, e não ao mês inteiro. Se o funcionário faltou em uma semana mas cumpriu integralmente as demais, perde apenas o DSR daquela semana.</p>

      <h2>Por que automatizar o cálculo do DSR?</h2>
      <p>O cálculo do DSR envolve variáveis que mudam mensalmente (dias úteis, feriados, horas extras, faltas). Fazer isso manualmente é demorado e propenso a erros que podem resultar em:</p>
      <ul>
        <li>Pagamento a mais ou a menos ao funcionário.</li>
        <li>Problemas no fechamento da folha de pagamento.</li>
        <li>Passivos trabalhistas em caso de cálculo incorreto.</li>
      </ul>
      <p>Um sistema de ponto digital como o <strong>WorkID</strong> registra a jornada com precisão e gera os dados necessários para o cálculo automático do DSR, horas extras e banco de horas — tudo integrado e sem erros.</p>

      <h2>Conclusão</h2>
      <p>O DSR é um direito fundamental do trabalhador e um cálculo obrigatório para toda empresa. Entender as fórmulas e aplicá-las corretamente evita problemas legais e garante uma relação justa com os colaboradores.</p>
      <p>Com o <strong>WorkID</strong>, sua empresa tem os dados precisos para calcular o DSR corretamente todos os meses, sem planilhas e sem dor de cabeça.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Simplifique o cálculo do DSR e da folha de pagamento</p>
        <p>O WorkID gera relatórios precisos para o fechamento da folha. Teste grátis por 14 dias.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "jornada-12x36-como-funciona-controle-ponto",
    title: "Jornada 12x36: como funciona e como controlar o ponto",
    description:
      "Entenda como funciona a jornada 12x36, o que diz a CLT, como registrar o ponto corretamente e os desafios de gestão dessa escala de trabalho.",
    date: "2026-03-10",
    readTime: "7 min",
    category: "Legislação",
    tags: ["jornada 12x36", "escala de trabalho", "controle de ponto", "CLT", "gestão de jornada"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que é a jornada 12x36?</h2>
      <p>A <strong>jornada 12x36</strong> é um regime de trabalho em que o funcionário trabalha <strong>12 horas consecutivas</strong> e descansa nas <strong>36 horas seguintes</strong>. É uma das escalas mais utilizadas em setores como saúde, segurança, portaria, indústria e hotelaria.</p>
      <p>Exemplo prático: se o colaborador entra às 7h da manhã, trabalha até as 19h. No dia seguinte, ele folga o dia inteiro e a manhã do próximo dia, retornando apenas às 19h (ou às 7h, dependendo da escala).</p>

      <h2>O que diz a CLT sobre a jornada 12x36?</h2>
      <p>A Reforma Trabalhista de 2017 incluiu o artigo 59-A na CLT, oficializando a jornada 12x36. Os pontos principais são:</p>
      <ul>
        <li><strong>Acordo individual escrito:</strong> desde a reforma, a jornada 12x36 pode ser estabelecida por acordo individual escrito entre empregado e empregador, sem necessidade de convenção coletiva.</li>
        <li><strong>Intervalo intrajornada:</strong> o funcionário tem direito a intervalo para refeição e descanso. Caso não seja possível conceder o intervalo, ele deve ser indenizado.</li>
        <li><strong>Feriados:</strong> o trabalho em feriados na jornada 12x36 é considerado compensado pelo descanso de 36 horas, ou seja, <strong>não gera pagamento em dobro</strong> (conforme entendimento do TST após a reforma).</li>
        <li><strong>Adicional noturno:</strong> se a jornada inclui trabalho entre 22h e 5h, o adicional noturno de 20% é devido normalmente.</li>
      </ul>

      <h2>Vantagens da jornada 12x36</h2>
      <p>Esse regime traz benefícios tanto para empresas quanto para funcionários:</p>
      <ul>
        <li><strong>Para a empresa:</strong> permite operação contínua 24 horas com menos escalas e trocas de turno, reduz custos com horas extras e simplifica a cobertura de postos.</li>
        <li><strong>Para o funcionário:</strong> proporciona mais dias de folga por mês (em média 15 dias), permitindo conciliar outros trabalhos ou atividades pessoais.</li>
        <li><strong>Redução de hora extra:</strong> como a compensação já está embutida na escala, o passivo com horas extras tende a ser menor.</li>
      </ul>

      <h2>Desafios na gestão da jornada 12x36</h2>
      <p>Apesar das vantagens, a jornada 12x36 apresenta desafios específicos de gestão:</p>

      <h3>1. Controle preciso do horário</h3>
      <p>Com turnos de 12 horas, minutos a mais ou a menos fazem grande diferença no final do mês. Um atraso de 15 minutos na saída, por exemplo, gera hora extra que precisa ser computada corretamente.</p>

      <h3>2. Gestão de intervalos</h3>
      <p>O intervalo intrajornada durante um turno de 12 horas é obrigatório. Se não for concedido ou for inferior ao mínimo legal (geralmente 1 hora), a empresa deve pagar o período como hora extra com adicional de 50%.</p>

      <h3>3. Troca de turnos</h3>
      <p>Em operações 24 horas, a troca de turno precisa ser precisa. Um funcionário não pode sair antes do substituto chegar, o que pode gerar horas extras não planejadas.</p>

      <h3>4. Controle de feriados e domingos</h3>
      <p>Embora a reforma tenha simplificado o tratamento de feriados na 12x36, é essencial registrar quais dias são feriados para cálculos corretos de adicional noturno e para respeitar eventuais cláusulas de convenção coletiva mais favoráveis.</p>

      <h2>Como controlar o ponto na jornada 12x36</h2>
      <p>O controle de ponto na jornada 12x36 exige um sistema capaz de lidar com suas particularidades:</p>
      <ul>
        <li><strong>Turnos que cruzam a meia-noite:</strong> o sistema deve entender que um turno de 19h às 7h pertence a uma única jornada, mesmo atravessando dois dias.</li>
        <li><strong>Escalas alternadas:</strong> o sistema precisa saber a escala de cada funcionário para identificar corretamente dias de trabalho e folga.</li>
        <li><strong>Cálculo automático de adicional noturno:</strong> para turnos noturnos, o sistema deve calcular automaticamente o adicional de 20% e a hora noturna reduzida.</li>
        <li><strong>Registro de intervalos:</strong> o sistema deve registrar o início e fim do intervalo intrajornada para comprovar que foi concedido.</li>
        <li><strong>Alertas de hora extra:</strong> como o limite é de 12 horas, qualquer minuto além deve gerar alerta ao gestor.</li>
      </ul>

      <h2>Exemplo prático de escala 12x36</h2>
      <p>Veja como funciona uma escala típica para um funcionário com turno diurno:</p>
      <ul>
        <li><strong>Segunda:</strong> trabalha das 7h às 19h</li>
        <li><strong>Terça:</strong> folga</li>
        <li><strong>Quarta:</strong> trabalha das 7h às 19h</li>
        <li><strong>Quinta:</strong> folga</li>
        <li><strong>Sexta:</strong> trabalha das 7h às 19h</li>
        <li><strong>Sábado:</strong> folga</li>
        <li><strong>Domingo:</strong> trabalha das 7h às 19h</li>
      </ul>
      <p>No mês, o funcionário trabalha aproximadamente 15 dias, totalizando cerca de 180 horas — dentro do limite de 220 horas mensais da CLT.</p>

      <h2>A tecnologia como aliada</h2>
      <p>Gerenciar jornadas 12x36 com planilhas é extremamente arriscado. São muitas variáveis: turnos noturnos, intervalos, feriados, trocas de escala. Um sistema de ponto digital como o <strong>WorkID</strong> resolve tudo automaticamente:</p>
      <ul>
        <li>Configuração de escalas 12x36 com poucos cliques.</li>
        <li>Registro de ponto pelo celular com GPS e reconhecimento facial — perfeito para porteiros, vigilantes e profissionais de saúde.</li>
        <li>Cálculo automático de adicional noturno e hora extra.</li>
        <li>Controle de intervalos intrajornada.</li>
        <li>Relatórios prontos para fechamento de folha.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>A jornada 12x36 é uma escala eficiente e legal, mas exige controle rigoroso para evitar erros e passivos trabalhistas. Com a tecnologia certa, sua empresa garante conformidade, economia e tranquilidade na gestão de equipes.</p>
      <p>O <strong>WorkID</strong> suporta jornadas 12x36 e outras escalas especiais, com tudo configurado de forma simples e automatizada.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Gerencie jornadas 12x36 sem complicação</p>
        <p>O WorkID configura escalas especiais em minutos. Teste grátis e simplifique sua gestão.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "reconhecimento-facial-ponto-vale-a-pena",
    title: "Reconhecimento facial no ponto: vale a pena?",
    description:
      "Entenda como funciona o reconhecimento facial no registro de ponto, quais os benefícios, os riscos e quando ele vale a pena para sua empresa.",
    date: "2026-04-05",
    readTime: "6 min",
    category: "Tecnologia",
    tags: ["reconhecimento facial", "segurança", "fraude", "biometria"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que é reconhecimento facial no ponto?</h2>
      <p>O <strong>reconhecimento facial</strong> é uma tecnologia biométrica que compara a foto capturada no momento da batida com uma foto de referência do colaborador, garantindo que é ele mesmo quem está registrando o ponto. Combinado com <a href="/blog/como-evitar-fraudes-registro-ponto-gps-reconhecimento-facial">GPS e geofence</a>, é a forma mais segura de controle de jornada disponível hoje.</p>

      <h2>Como funciona na prática?</h2>
      <p>O processo acontece em segundos e é totalmente transparente para o funcionário:</p>
      <ul>
        <li><strong>Cadastro inicial:</strong> No primeiro acesso, o colaborador tira uma selfie de referência.</li>
        <li><strong>Captura no ponto:</strong> Cada vez que bate o ponto, uma nova foto é capturada automaticamente.</li>
        <li><strong>Comparação por IA:</strong> Um algoritmo (no caso do WorkID, a AWS Rekognition) compara as duas fotos.</li>
        <li><strong>Validação:</strong> Se a similaridade for alta o suficiente, o ponto é aceito. Caso contrário, é bloqueado.</li>
      </ul>

      <h2>Quais os benefícios?</h2>
      <ul>
        <li><strong>Fim da "batida por terceiros":</strong> Não adianta um colega bater o ponto por você — a foto não confere.</li>
        <li><strong>Segurança jurídica:</strong> Em uma auditoria, você tem uma foto datada de cada registro.</li>
        <li><strong>Rápido e sem fricção:</strong> Apenas uma selfie, em segundos.</li>
        <li><strong>Sem hardware caro:</strong> O celular do próprio funcionário já resolve.</li>
      </ul>

      <h2>E a LGPD?</h2>
      <p>Sim, dados biométricos são considerados <strong>dados sensíveis</strong> pela LGPD. Você precisa:</p>
      <ul>
        <li>Obter consentimento explícito do colaborador;</li>
        <li>Informar a finalidade do uso (controle de ponto);</li>
        <li>Armazenar as fotos com segurança;</li>
        <li>Permitir que o colaborador solicite exclusão dos dados ao sair.</li>
      </ul>
      <p>Com o <a href="/signup">WorkID</a>, tudo isso já vem configurado por padrão — o colaborador dá ciência no primeiro login.</p>

      <h2>Vale a pena para pequenas empresas?</h2>
      <p>Depende do seu cenário. Se você tem poucos funcionários e todos trabalham no mesmo local, só <a href="/blog/o-que-e-ponto-digital-como-funciona">GPS já resolve</a>. Mas se você tem:</p>
      <ul>
        <li>Equipes externas ou em campo;</li>
        <li>Múltiplas unidades;</li>
        <li>Histórico de "favores" entre colegas;</li>
        <li>Necessidade de auditoria rigorosa;</li>
      </ul>
      <p>...o reconhecimento facial é fundamental.</p>

      <h2>Conclusão</h2>
      <p>Reconhecimento facial deixou de ser luxo e virou padrão para quem leva controle de jornada a sério. Com o <strong>WorkID</strong>, essa tecnologia está incluída em todos os planos.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Zero fraudes no seu controle de ponto</p>
        <p>GPS + reconhecimento facial + geofence. Teste grátis.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "ponto-eletronico-lgpd-o-que-saber",
    title: "Ponto eletrônico e LGPD: o que você precisa saber",
    description:
      "Como adequar seu sistema de ponto eletrônico à LGPD. Direitos do colaborador, base legal, armazenamento e como o WorkID ajuda.",
    date: "2026-04-07",
    readTime: "8 min",
    category: "Compliance",
    tags: ["LGPD", "privacidade", "ponto digital", "compliance"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>LGPD e controle de ponto: por onde começar?</h2>
      <p>A Lei Geral de Proteção de Dados (LGPD) alcança qualquer empresa que trate dados pessoais — e dados de ponto (horário, localização, foto) definitivamente se encaixam. Se você usa <a href="/blog/o-que-e-ponto-digital-como-funciona">ponto digital</a>, precisa entender as obrigações.</p>

      <h2>Quais dados de ponto são sensíveis?</h2>
      <ul>
        <li><strong>Foto / biometria facial:</strong> dado sensível — exige consentimento explícito.</li>
        <li><strong>Geolocalização:</strong> dado pessoal — exige finalidade clara.</li>
        <li><strong>Horários de entrada/saída:</strong> dado pessoal — tratado pela base legal de execução de contrato de trabalho.</li>
      </ul>

      <h2>Quais são as obrigações da empresa?</h2>
      <ul>
        <li>Informar ao colaborador quais dados são coletados e por que;</li>
        <li>Obter consentimento para dados biométricos;</li>
        <li>Armazenar os dados com segurança (criptografia, acesso restrito);</li>
        <li>Manter os dados somente enquanto forem necessários;</li>
        <li>Permitir acesso, correção e exclusão quando solicitado;</li>
        <li>Informar vazamentos à ANPD se ocorrerem.</li>
      </ul>

      <h2>Direitos do colaborador</h2>
      <p>Pela LGPD, o colaborador pode solicitar:</p>
      <ul>
        <li>Acesso aos dados armazenados (histórico de pontos, fotos);</li>
        <li>Correção de dados incorretos;</li>
        <li>Exclusão dos dados após o desligamento (com prazos legais);</li>
        <li>Portabilidade (receber os dados em formato aberto).</li>
      </ul>

      <h2>Como o WorkID ajuda?</h2>
      <p>O <a href="/signup">WorkID</a> foi projetado com LGPD em mente:</p>
      <ul>
        <li><strong>Termo de ciência digital:</strong> o colaborador assina eletronicamente autorizando uso de biometria e GPS;</li>
        <li><strong>Criptografia:</strong> todos os dados são criptografados em trânsito e em repouso;</li>
        <li><strong>Controle de acesso:</strong> só admins autorizados visualizam fotos e dados;</li>
        <li><strong>Retenção automática:</strong> fotos antigas são expurgadas conforme política configurável;</li>
        <li><strong>Export e portabilidade:</strong> o colaborador pode solicitar todos os dados em PDF.</li>
      </ul>

      <h2>E se eu não fizer nada?</h2>
      <p>Multas podem chegar a <strong>R$ 50 milhões por infração</strong>. Além disso, colaboradores podem processar individualmente. Em disputas trabalhistas, provas obtidas em desacordo com a LGPD podem ser descartadas.</p>

      <h2>Checklist rápido</h2>
      <ul>
        <li>✅ Termo de ciência assinado pelo colaborador;</li>
        <li>✅ Política de privacidade publicada;</li>
        <li>✅ Encarregado de dados (DPO) designado;</li>
        <li>✅ Sistema de ponto com conformidade comprovada;</li>
        <li>✅ Plano de resposta a incidentes.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>LGPD não é opcional. Mas com a tecnologia certa, atender a lei é simples. Veja também nossos guias sobre <a href="/blog/portaria-671-controle-de-ponto">Portaria 671</a> e <a href="/blog/ponto-eletronico-obrigatorio-lei">obrigatoriedade legal do ponto</a>.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">LGPD em dia com o WorkID</p>
        <p>Termo digital, criptografia e retenção automática. Tudo pronto para auditoria.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "como-implantar-ponto-digital-7-dias",
    title: "Como implantar ponto digital na sua empresa em 7 dias",
    description:
      "Um cronograma prático, dia a dia, para migrar do cartão de ponto para o ponto digital em uma semana. Checklist completo.",
    date: "2026-04-09",
    readTime: "7 min",
    category: "Guia",
    tags: ["implantação", "migração", "ponto digital", "RH"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>Migrar para ponto digital não precisa ser complicado</h2>
      <p>Muitos gestores acham que implantar um sistema de <a href="/blog/o-que-e-ponto-digital-como-funciona">ponto digital</a> vai demorar meses e gerar resistência. Na prática, dá pra fazer em uma semana se seguir um plano claro. Aqui vai o cronograma.</p>

      <h2>Dia 1 — Diagnóstico</h2>
      <ul>
        <li>Liste todos os funcionários e suas jornadas atuais;</li>
        <li>Identifique regras especiais (hora extra, banco de horas, jornadas diferenciadas);</li>
        <li>Liste os locais de trabalho e se há home office;</li>
        <li>Verifique feriados locais e folgas acordadas.</li>
      </ul>

      <h2>Dia 2 — Escolha a ferramenta</h2>
      <p>Compare opções. Critérios importantes:</p>
      <ul>
        <li>Conformidade com a <a href="/blog/portaria-671-controle-de-ponto">Portaria 671</a>;</li>
        <li>GPS e <a href="/blog/reconhecimento-facial-ponto-vale-a-pena">reconhecimento facial</a>;</li>
        <li>Funciona no celular do funcionário (sem hardware extra);</li>
        <li>Suporte responsivo;</li>
        <li>Preço por funcionário ativo.</li>
      </ul>
      <p>O <a href="/signup">WorkID</a> atende todos esses requisitos e oferece 14 dias grátis.</p>

      <h2>Dia 3 — Configuração inicial</h2>
      <ul>
        <li>Cadastre a empresa e o admin;</li>
        <li>Defina jornadas padrão (6h, 8h, 12x36, etc);</li>
        <li>Configure o local de trabalho (latitude/longitude e raio);</li>
        <li>Cadastre feriados da sua empresa.</li>
      </ul>

      <h2>Dia 4 — Cadastro dos funcionários</h2>
      <ul>
        <li>Importe a lista via planilha (ou cadastre um a um);</li>
        <li>Envie os convites por e-mail automaticamente;</li>
        <li>Defina quem é admin, quem é funcionário.</li>
      </ul>

      <h2>Dia 5 — Treinamento rápido</h2>
      <p>Junte todos (presencial ou remoto) em um encontro de 30 minutos:</p>
      <ul>
        <li>Mostre como instalar o PWA no celular;</li>
        <li>Faça uma batida ao vivo;</li>
        <li>Explique o termo de ciência (<a href="/blog/ponto-eletronico-lgpd-o-que-saber">LGPD</a>);</li>
        <li>Mostre como solicitar ajuste em caso de esquecimento.</li>
      </ul>

      <h2>Dia 6 — Período paralelo</h2>
      <p>Use por 1-2 dias ao mesmo tempo que o sistema antigo. Compare resultados. Resolva dúvidas.</p>

      <h2>Dia 7 — Go-live</h2>
      <p>Desative o sistema antigo. Celebrate! Nos próximos 30 dias, monitore:</p>
      <ul>
        <li>Atrasos e faltas (o sistema avisa em tempo real);</li>
        <li><a href="/blog/banco-de-horas-como-calcular-gerenciar">Banco de horas</a>;</li>
        <li>Solicitações de ajuste (elas caem — a precisão melhora).</li>
      </ul>

      <h2>Dica extra: envolva o time</h2>
      <p>Apresente o ponto digital como uma <strong>melhoria para o funcionário</strong>: sem cartão perdido, sem fila para bater, transparência de horas. A adesão é muito melhor quando todos veem valor.</p>

      <h2>Conclusão</h2>
      <p>Em uma semana você pode ter um sistema moderno, legal e sem papel. Não adie mais.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Comece hoje mesmo</p>
        <p>Teste o WorkID gratuitamente por 14 dias. Sem cartão, sem burocracia.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "atestado-medico-digital-como-validar",
    title: "Atestado médico digital: como receber, validar e arquivar",
    description:
      "Como aceitar atestados médicos digitalmente na empresa, quais os critérios legais e como o WorkID automatiza todo o processo.",
    date: "2026-04-10",
    readTime: "6 min",
    category: "Gestão",
    tags: ["atestado", "ausência", "RH", "documentação"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>Atestado médico ainda em papel?</h2>
      <p>Se você ainda recebe atestados em papel na empresa, está perdendo tempo e correndo risco. Um atestado digital, armazenado no sistema de ponto, é mais seguro, rastreável e dá transparência tanto para o RH quanto para o colaborador.</p>

      <h2>Como funciona o atestado digital?</h2>
      <ul>
        <li>O colaborador abre o app e vai em "Ausências";</li>
        <li>Seleciona o tipo (atestado médico, licença, justificativa);</li>
        <li>Tira foto ou faz upload do documento;</li>
        <li>O admin recebe uma notificação e aprova ou rejeita;</li>
        <li>O ponto desses dias fica marcado como "ausência justificada" automaticamente.</li>
      </ul>

      <h2>O que precisa constar no atestado?</h2>
      <ul>
        <li>Nome do paciente;</li>
        <li>CID (opcional, mas recomendado);</li>
        <li>Data de emissão;</li>
        <li>Número de dias de afastamento;</li>
        <li>Assinatura e CRM do médico (ou certificado ICP-Brasil se digital).</li>
      </ul>

      <h2>E na hora de integrar com o banco de horas?</h2>
      <p>Quando aprovado, o atestado automaticamente isenta o funcionário daquele dia no <a href="/blog/banco-de-horas-como-calcular-gerenciar">cálculo de banco de horas</a> e no <a href="/blog/dsr-descanso-semanal-remunerado-como-calcular">DSR</a>. Isso evita erros na folha.</p>

      <h2>Como o WorkID ajuda?</h2>
      <ul>
        <li>App do funcionário com upload em 2 toques;</li>
        <li>Notificação push para admin em tempo real;</li>
        <li>Arquivo armazenado por anos (para auditoria);</li>
        <li>Integração automática com folha e banco de horas;</li>
        <li>Registro com data/hora imutável.</li>
      </ul>

      <h2>Validade jurídica</h2>
      <p>Uma foto legível do atestado é aceita pela justiça do trabalho, desde que armazenada com data de envio e não tenha sido alterada. Sistemas como o <a href="/signup">WorkID</a> garantem isso com hash criptográfico automático.</p>

      <h2>Conclusão</h2>
      <p>Eliminar papel no RH é uma vitória pra todo mundo: menos burocracia para o colaborador, mais organização para o admin, menos risco pra empresa. Atestado digital é o padrão moderno.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Chega de atestado perdido</p>
        <p>Com o WorkID, tudo fica organizado e acessível para auditoria a qualquer hora.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "5-erros-comuns-controle-ponto",
    title: "5 erros comuns no controle de ponto (e como evitar)",
    description:
      "Os erros mais frequentes que empresas cometem no controle de ponto e como o ponto digital resolve cada um deles.",
    date: "2026-04-12",
    readTime: "5 min",
    category: "Gestão",
    tags: ["erros", "gestão", "ponto", "melhores práticas"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>1. Aceitar "batida por terceiros"</h2>
      <p>Colegas batendo ponto uns pelos outros é o clássico. Solução: <a href="/blog/reconhecimento-facial-ponto-vale-a-pena">reconhecimento facial</a> torna isso impossível. Cada batida tem uma foto datada.</p>

      <h2>2. Não ter política clara de horas extras</h2>
      <p>Funcionários chegam cedo ou saem tarde "por conta própria" e depois cobram como extra. Solução: aprovação obrigatória de <a href="/blog/como-calcular-hora-extra-clt">hora extra</a> pelo gestor antes de contabilizar.</p>

      <h2>3. Esquecer feriados locais</h2>
      <p>Cada cidade tem seus feriados. Se o sistema não está atualizado, o cálculo sai errado. Solução: cadastro de feriados por empresa, com importação de calendário oficial.</p>

      <h2>4. Não controlar home office</h2>
      <p>Funcionários em <a href="/blog/home-office-controle-ponto-remoto">home office</a> também precisam bater ponto. Sem controle, você tem um "buraco negro" de jornada que vira problema em rescisão.</p>

      <h2>5. Guardar registros em planilha</h2>
      <p>Planilha no Excel é prova fraca na justiça. E qualquer um pode editar. Solução: sistema de ponto digital com registro imutável e logs de auditoria.</p>

      <h2>Como o WorkID resolve tudo isso?</h2>
      <ul>
        <li>Reconhecimento facial + GPS em toda batida;</li>
        <li>Fluxo de aprovação de HE pré-configurado;</li>
        <li>Gestão de feriados por unidade;</li>
        <li>App mobile para trabalhos remotos;</li>
        <li>Armazenamento criptografado e imutável.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>Se você reconhece sua empresa em 2+ desses erros, é hora de modernizar. Dá pra <a href="/blog/como-implantar-ponto-digital-7-dias">implantar em 7 dias</a>.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Evite dor de cabeça no RH</p>
        <p>Controle de ponto profissional a partir de R$ 9,90 por funcionário.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "quanto-custa-sistema-ponto-eletronico-digital",
    title: "Quanto custa um sistema de ponto eletrônico digital em 2026",
    description:
      "Descubra quanto custa um sistema de ponto eletrônico digital em 2026. Faixas de preço por funcionário, modelos de cobrança, e como calcular o ROI real para sua empresa.",
    date: "2026-04-23",
    readTime: "9 min",
    category: "Guia",
    tags: ["ponto eletrônico digital", "preço ponto eletrônico", "custo RH", "economia"],
    ogImage: "/images/og-image.png",
    content: `
      <p>Uma das primeiras perguntas de quem procura um <strong>sistema de ponto eletrônico digital</strong> é: quanto custa? A resposta real é "depende" — mas neste guia você vai ver faixas reais de preço praticadas no Brasil em 2026, como funciona cada modelo de cobrança e, mais importante, como calcular se o investimento vale a pena pra sua empresa.</p>

      <h2>Quanto custa um sistema de ponto eletrônico digital por mês?</h2>
      <p>O custo de um ponto eletrônico digital varia principalmente pelo <strong>número de funcionários</strong>. Em 2026, a faixa de preço mais comum no mercado brasileiro é:</p>
      <ul>
        <li><strong>De R$ 5 a R$ 12 por funcionário/mês</strong> — para sistemas SaaS (software como serviço) em nuvem, com app, GPS, reconhecimento facial e relatórios.</li>
        <li><strong>De R$ 15 a R$ 30 por funcionário/mês</strong> — sistemas corporativos robustos, voltados para grandes empresas, com integrações avançadas (ERP, folha de pagamento).</li>
        <li><strong>Plano fixo de R$ 100 a R$ 500/mês</strong> — com limite de funcionários (ex: até 10, 25 ou 50 pessoas), ideal para pequenas empresas.</li>
      </ul>
      <p>Ou seja, uma empresa com 10 funcionários pode pagar de R$ 50 a R$ 120 por mês. Já com 50 funcionários, a conta fica entre R$ 250 e R$ 600 mensais — o equivalente a uma fração do salário de um único colaborador.</p>

      <h2>Modelos de cobrança mais comuns</h2>
      <p>Antes de contratar, entenda como cada modelo funciona:</p>
      <h3>1. Pay-per-user (por funcionário ativo)</h3>
      <p>O mais transparente e justo. Você paga apenas pelos funcionários que realmente usam o sistema. Se alguém for demitido, o custo cai no mês seguinte. Indicado para empresas em crescimento.</p>
      <h3>2. Plano fixo por faixa</h3>
      <p>Você paga um valor fixo até X funcionários (ex: R$ 149/mês para até 25 pessoas). Acima disso, precisa fazer upgrade. Bom para empresas estáveis, mas pode virar armadilha se você crescer e tiver que migrar de plano com custo adicional.</p>
      <h3>3. Licença anual</h3>
      <p>Comum em sistemas tradicionais. Você paga tudo de uma vez (ex: R$ 2.400/ano), geralmente com desconto em relação ao mensal. Menos flexível se sua equipe oscila de tamanho.</p>
      <h3>4. On-premise (software local)</h3>
      <p>Você compra a licença (R$ 3.000 a R$ 15.000 one-time) e instala em seu próprio servidor. Custa mais de entrada, mas não tem mensalidade. Problema: você fica responsável por backup, segurança e atualizações. Modelo em desuso na era SaaS.</p>

      <h2>O que deveria estar incluso no preço</h2>
      <p>Cuidado com sistemas que cobram "por módulo" e depois inflam a conta. Um <strong>ponto eletrônico digital</strong> completo em 2026 deve incluir, sem custo extra:</p>
      <ul>
        <li>App mobile (Android e iOS) ou PWA.</li>
        <li>Registro por GPS com geofencing.</li>
        <li>Reconhecimento facial ou foto em toda batida.</li>
        <li>Dashboard em tempo real pro gestor.</li>
        <li>Relatórios de espelho de ponto, banco de horas e horas extras.</li>
        <li>Exportação em PDF e Excel.</li>
        <li>Conformidade com a <a href="/blog/portaria-671-controle-de-ponto">Portaria 671 do MTE</a>.</li>
        <li>Suporte via chat ou WhatsApp.</li>
        <li>Backup automático e criptografia.</li>
      </ul>
      <p>Se o sistema cobra extra por algum desses itens, está cobrando por algo que é padrão no mercado.</p>

      <h2>Custos escondidos que você precisa conhecer</h2>
      <p>Leia o contrato antes de assinar. Alguns custos menos óbvios:</p>
      <ul>
        <li><strong>Taxa de implantação:</strong> alguns fornecedores cobram R$ 500 a R$ 2.000 só pra "configurar" — quando o sistema deveria ser plug-and-play.</li>
        <li><strong>Cobrança por filial:</strong> se sua empresa tem mais de uma unidade, alguns sistemas cobram extra por filial, mesmo que o número total de funcionários não mude.</li>
        <li><strong>Treinamento obrigatório pago:</strong> sistemas complexos exigem treinamento caro. Sistemas modernos têm interface autoexplicativa — você e sua equipe aprendem em minutos.</li>
        <li><strong>Multa de cancelamento:</strong> alguns contratos anuais cobram multa pesada para cancelar antes do prazo. Prefira mensal sem fidelidade.</li>
        <li><strong>Integração com ERP:</strong> em sistemas corporativos, a API de integração pode ser um módulo separado com mensalidade própria.</li>
      </ul>

      <h2>Como calcular o ROI do ponto eletrônico digital</h2>
      <p>Antes de olhar só o preço, calcule quanto você já perde hoje sem um sistema moderno. Exemplo real:</p>
      <p>Uma empresa com <strong>20 funcionários</strong> que ainda usa planilha ou folha de ponto manual, em média:</p>
      <ul>
        <li>Gasta <strong>8 a 12 horas do RH por mês</strong> consolidando dados, corrigindo erros e calculando horas extras. Considerando R$ 40/hora do analista, isso é R$ 320 a R$ 480 só em tempo.</li>
        <li>Paga <strong>3% a 8% a mais em horas extras</strong> por erros de cálculo e batidas esquecidas. Em uma folha de R$ 40.000, são até R$ 3.200 por mês jogados fora.</li>
        <li>Tem risco real de <strong>condenação trabalhista</strong> por falta de registro adequado — valor médio de processo por jornada: R$ 15.000 a R$ 50.000 por funcionário.</li>
      </ul>
      <p>Um sistema de R$ 10 × 20 funcionários = R$ 200/mês. O ROI é evidente: o sistema se paga <strong>no primeiro mês</strong>, só evitando os erros de cálculo de hora extra.</p>

      <h2>Ponto eletrônico digital para pequenas empresas: vale a pena?</h2>
      <p>Sim, e mais do que pra grandes. Empresas pequenas geralmente não têm um RH estruturado e são as primeiras a cair em processos trabalhistas por falta de documentação. Um sistema de R$ 50 a R$ 100 por mês faz o papel de um mini-departamento jurídico — tudo fica registrado, assinado digitalmente e pronto pra se defender. Veja o <a href="/blog/ponto-eletronico-pequenas-empresas-guia-completo">guia específico pra pequenas empresas</a>.</p>

      <h2>Comparando fornecedores: o que olhar</h2>
      <p>Ao comparar preços de ponto eletrônico digital, não olhe só a mensalidade. Crie uma tabela com:</p>
      <ul>
        <li>Preço por funcionário/mês.</li>
        <li>Se tem taxa de implantação.</li>
        <li>Funcionalidades inclusas vs extras.</li>
        <li>Período de teste grátis (mínimo 7 dias é o normal; 14 dias é bom).</li>
        <li>Necessidade de cartão de crédito para testar.</li>
        <li>Política de cancelamento (ideal: sem fidelidade, cancele quando quiser).</li>
        <li>Canais de suporte (chat, WhatsApp, telefone).</li>
        <li>Avaliações reais de clientes (Google, Reclame Aqui, B2B Stack).</li>
      </ul>

      <h2>Conclusão: quanto investir?</h2>
      <p>Em 2026, o <strong>preço justo de um sistema de ponto eletrônico digital</strong> para a maioria das empresas brasileiras fica entre R$ 6 e R$ 12 por funcionário/mês, incluindo GPS, reconhecimento facial, banco de horas e conformidade legal. Fuja de sistemas que cobram taxa de implantação, treinamento obrigatório ou por módulo — isso é um modelo antigo que só existe pra inflar a mensalidade.</p>
      <p>Lembre-se: o ponto eletrônico digital não é despesa, é <strong>economia</strong>. Ele se paga nos primeiros 30 dias só reduzindo horas extras erradas e tempo de RH.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">WorkID a partir de R$ 9,90 por funcionário</p>
        <p>Tudo incluso, sem taxa de implantação, sem fidelidade. Teste grátis por 14 dias, sem cartão de crédito.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "ponto-eletronico-gps-como-funciona-legal",
    title: "Ponto eletrônico por GPS: como funciona e é legal no Brasil",
    description:
      "Entenda como funciona o ponto eletrônico por GPS, como a geolocalização é usada para validar batidas, e o que a legislação brasileira (Portaria 671) diz sobre isso.",
    date: "2026-04-22",
    readTime: "8 min",
    category: "Tecnologia",
    tags: ["ponto eletrônico", "GPS", "geolocalização", "geofence", "home office"],
    ogImage: "/images/og-image.png",
    content: `
      <p>O <strong>ponto eletrônico por GPS</strong> é uma das tecnologias que mais revolucionou o controle de jornada no Brasil. Em vez do funcionário depender de um relógio fixo na porta da empresa, ele bate o ponto diretamente pelo celular — e o sistema confirma, via localização, que ele está no lugar certo. Mas como exatamente isso funciona? E mais importante: é legal? Neste guia, você vai entender tudo.</p>

      <h2>Como funciona o ponto eletrônico por GPS</h2>
      <p>Na prática, o processo é simples. Quando o colaborador abre o app e toca no botão de registrar ponto, três coisas acontecem ao mesmo tempo:</p>
      <ol>
        <li>O celular pede permissão de localização pro sistema operacional.</li>
        <li>O app captura as coordenadas GPS (latitude e longitude) no momento exato da batida.</li>
        <li>O sistema compara essa localização com um raio pré-definido pela empresa (ex: 100 metros ao redor da loja, da obra ou do endereço do cliente).</li>
      </ol>
      <p>Se o funcionário está dentro do raio, a batida é aceita. Se está fora, o sistema pode bloquear ou registrar como "fora da área" — dependendo da configuração. Esse raio virtual recebe o nome técnico de <strong>geofence</strong> (cerca virtual).</p>

      <h2>O que é geofence (cerca virtual)?</h2>
      <p>Geofence é um perímetro geográfico desenhado no mapa. Ele pode ter qualquer formato — circular, poligonal — e é definido pelo gestor. Cada funcionário, setor ou escala pode ter sua própria geofence. Exemplos práticos:</p>
      <ul>
        <li><strong>Loja única:</strong> raio de 50m ao redor do endereço. Só aceita batida dentro.</li>
        <li><strong>Construção civil:</strong> polígono cobrindo o canteiro de obras. Atualizado quando a obra muda de local.</li>
        <li><strong>Vendedor externo:</strong> sem geofence (qualquer lugar), mas com registro obrigatório da localização pra auditoria.</li>
        <li><strong>Home office:</strong> raio de 100m ao redor da residência cadastrada do funcionário.</li>
      </ul>
      <p>Essa flexibilidade é o que torna o <strong>ponto por GPS</strong> ideal para empresas com equipes distribuídas, obra ou serviço em campo.</p>

      <h2>Ponto por GPS é legal no Brasil?</h2>
      <p>Sim. A <a href="/blog/portaria-671-controle-de-ponto">Portaria 671 do Ministério do Trabalho</a>, que regulamenta os sistemas eletrônicos de controle de ponto, permite expressamente o registro por celular com geolocalização, desde que o sistema atenda aos requisitos técnicos: integridade dos dados, registro imutável, acesso do trabalhador aos seus próprios registros, e não bloqueio de batida (o sistema pode alertar, mas não pode impedir o funcionário de marcar o ponto).</p>
      <p>Além disso, a <strong>Reforma Trabalhista de 2017</strong> já havia aberto espaço para sistemas alternativos de controle, incluindo aplicativos móveis. Isso foi reforçado pela Portaria 671 em 2021. Hoje, mais de 70% das empresas brasileiras com mais de 10 funcionários já usam algum tipo de sistema digital de ponto — e o GPS é parte fundamental disso.</p>

      <h2>Precisão do GPS: o sistema erra?</h2>
      <p>Em ambientes abertos, o GPS moderno tem precisão de <strong>5 a 15 metros</strong>. Em ambientes fechados (prédios, subsolos), a precisão cai — pode chegar a 50m ou mais. Sistemas de ponto eletrônico digital sérios compensam isso com:</p>
      <ul>
        <li><strong>GPS + Wi-Fi + torres de celular:</strong> triangulação usando múltiplas fontes pra melhorar a precisão.</li>
        <li><strong>Tolerância no raio:</strong> em vez de 10m, o gestor configura 100m. Acomoda imprecisão sem permitir fraude real.</li>
        <li><strong>Indicador de precisão no app:</strong> o funcionário vê a margem de erro antes de bater (ex: "±8m"). Se estiver alta, ele pode aguardar o GPS estabilizar.</li>
        <li><strong>Log completo pra auditoria:</strong> o sistema registra a precisão junto com a coordenada — em disputa, é possível provar o que aconteceu.</li>
      </ul>

      <h2>E se o funcionário falsificar a localização?</h2>
      <p>Existem apps de <strong>fake GPS</strong> que mudam a localização do celular. Por isso, sistemas profissionais combinam o GPS com outras verificações:</p>
      <ul>
        <li><strong>Detecção de mock location:</strong> o sistema operacional Android sinaliza quando um app está simulando localização. O sistema de ponto detecta e bloqueia.</li>
        <li><strong>Reconhecimento facial:</strong> mesmo com GPS fake, o rosto precisa bater com o cadastro. Veja <a href="/blog/reconhecimento-facial-ponto-vale-a-pena">se vale a pena usar</a>.</li>
        <li><strong>Cruzamento com histórico:</strong> se o funcionário nunca bate pela manhã em São Paulo e de repente aparece batendo em Salvador, o sistema alerta.</li>
        <li><strong>IP address logging:</strong> o IP do dispositivo geralmente revela a cidade real, mesmo com GPS falso.</li>
      </ul>
      <p>Nenhum sistema é 100% à prova de fraude, mas a combinação de GPS + biometria + log torna a fraude tão trabalhosa que deixa de compensar.</p>

      <h2>Ponto por GPS e LGPD: privacidade do funcionário</h2>
      <p>Sim, localização é dado pessoal e está protegida pela LGPD. Mas a empresa pode coletá-la legitimamente se:</p>
      <ul>
        <li>O funcionário for informado previamente (em contrato ou termo específico).</li>
        <li>A coleta acontecer apenas no momento da batida (não em tempo real durante toda a jornada).</li>
        <li>Os dados forem usados exclusivamente para controle de ponto e não compartilhados com terceiros.</li>
      </ul>
      <p>Sistemas sérios pedem permissão de localização apenas quando o app é aberto para bater ponto — não rastreiam o funcionário. Esse é o padrão ético e legal. Veja mais sobre <a href="/blog/ponto-eletronico-lgpd-o-que-saber">ponto eletrônico e LGPD</a>.</p>

      <h2>Vantagens do ponto por GPS sobre o relógio tradicional</h2>
      <ul>
        <li><strong>Equipes externas:</strong> vendedores, motoristas, técnicos, obras — todos podem bater ponto onde estiverem.</li>
        <li><strong>Home office:</strong> sem necessidade de ida à empresa só pra registrar.</li>
        <li><strong>Múltiplas unidades:</strong> uma conta atende todas as filiais, cada uma com sua geofence.</li>
        <li><strong>Sem hardware:</strong> zero custo com relógio, cartão, catraca ou biometria física.</li>
        <li><strong>Auditoria completa:</strong> cada batida tem coordenada, data, hora, foto e IP registrados de forma imutável.</li>
      </ul>

      <h2>Quando o ponto por GPS NÃO é ideal</h2>
      <p>Apesar das vantagens, existem casos onde o GPS não é a melhor solução:</p>
      <ul>
        <li><strong>Ambientes fechados com bloqueio de sinal:</strong> subsolos, galpões metálicos, câmaras frias. O GPS simplesmente não chega. Nesses casos, combine com Wi-Fi corporativo.</li>
        <li><strong>Funcionários sem celular próprio:</strong> ainda acontece. Nesses casos, o sistema pode usar tablets compartilhados fixos na entrada (com foto obrigatória).</li>
        <li><strong>Indústrias com alta rotatividade e baixa confiança:</strong> combine GPS com biometria física (digital ou facial em terminal fixo).</li>
      </ul>

      <h2>Conclusão</h2>
      <p>O <strong>ponto eletrônico por GPS</strong> é totalmente legal, tecnicamente confiável e a melhor solução para a maioria das empresas brasileiras em 2026. A combinação de geofence, reconhecimento facial e log imutável transforma o controle de jornada em algo que o relógio de ponto tradicional nunca foi: inteligente, remoto e à prova de fraude.</p>
      <p>Se sua empresa tem equipe externa, múltiplas filiais, home office ou quer simplesmente modernizar o RH, esse é o caminho. Veja o <a href="/blog/home-office-controle-ponto-remoto">guia de controle de ponto em home office</a> para casos específicos.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Ponto por GPS com geofence e biometria</p>
        <p>WorkID faz tudo isso em um app simples. Teste grátis por 14 dias.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "ponto-biometrico-vs-ponto-digital-diferenca",
    title: "Ponto biométrico vs ponto digital: diferença e qual escolher",
    description:
      "Comparativo completo entre ponto biométrico (relógio de digital/facial) e ponto digital (celular). Vantagens, custos, segurança e qual escolher para sua empresa.",
    date: "2026-04-21",
    readTime: "7 min",
    category: "Comparativo",
    tags: ["ponto biométrico", "ponto digital", "comparativo", "tecnologia RH"],
    ogImage: "/images/og-image.png",
    content: `
      <p>Muita empresa chega na hora de escolher entre <strong>ponto biométrico</strong> (um relógio de ponto com leitura de digital ou rosto, instalado na parede) e <strong>ponto digital</strong> (registro pelo celular do funcionário, via app). Os dois são sistemas eletrônicos, os dois são legais, mas funcionam de forma muito diferente. Este guia mostra as diferenças reais, os custos e em que cenário cada um faz mais sentido.</p>

      <h2>O que é ponto biométrico</h2>
      <p>O <strong>ponto biométrico</strong> é um equipamento físico (relógio de ponto) instalado na entrada da empresa. O funcionário encosta o dedo no leitor de digital ou olha pra uma câmera que reconhece o rosto. O equipamento valida a identidade e registra a entrada ou saída. É a evolução do antigo relógio de cartão — mais seguro contra fraude, mas ainda preso a um lugar físico.</p>
      <p>Equipamentos típicos incluem relógios como os da Henry, Madis, Topdata ou Control iD. Custam de R$ 1.500 a R$ 8.000 cada, mais instalação, manutenção e software de gestão (que pode ser separado).</p>

      <h2>O que é ponto digital</h2>
      <p>O <strong>ponto digital</strong> (ou ponto por celular, ponto mobile) é um sistema em nuvem onde o funcionário registra via app no próprio celular, com GPS, foto e reconhecimento facial por software. Não precisa de hardware. É baseado em SaaS (software como serviço), com mensalidade por funcionário. Veja como funciona em detalhe em <a href="/blog/o-que-e-ponto-digital-como-funciona">o que é ponto digital</a>.</p>

      <h2>Tabela comparativa: ponto biométrico vs ponto digital</h2>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
          <thead>
            <tr style="background: rgba(124, 58, 237, 0.1);">
              <th style="text-align: left; padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.3);">Aspecto</th>
              <th style="text-align: left; padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.3);">Ponto biométrico</th>
              <th style="text-align: left; padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.3);">Ponto digital</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);"><strong>Investimento inicial</strong></td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">R$ 1.500 a R$ 8.000/equipamento</td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">R$ 0 (zero)</td>
            </tr>
            <tr>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);"><strong>Custo mensal</strong></td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Manutenção + software gestão (R$ 100 a R$ 500)</td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">R$ 6 a R$ 12 por funcionário</td>
            </tr>
            <tr>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);"><strong>Equipes externas</strong></td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Não atende (preso à parede)</td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Sim — bate de qualquer lugar com GPS</td>
            </tr>
            <tr>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);"><strong>Home office</strong></td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Não atende</td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Ideal</td>
            </tr>
            <tr>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);"><strong>Filas no início do expediente</strong></td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Problema real com equipes grandes</td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Zero fila (cada um bate no próprio celular)</td>
            </tr>
            <tr>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);"><strong>Múltiplas unidades</strong></td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Um relógio por unidade (custo multiplicado)</td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Uma conta, geofence por unidade</td>
            </tr>
            <tr>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);"><strong>Manutenção</strong></td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Quebras, técnicos, reposição de peças</td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Zero (fornecedor cuida de tudo)</td>
            </tr>
            <tr>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);"><strong>Segurança contra fraude</strong></td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Alta (biometria física)</td>
              <td style="padding: 0.75rem; border: 1px solid rgba(124, 58, 237, 0.2);">Alta (facial + GPS + geofence)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Vantagens do ponto biométrico</h2>
      <ul>
        <li><strong>Independe de celular do funcionário:</strong> útil em fábricas onde celulares são proibidos na linha de produção.</li>
        <li><strong>Biometria física robusta:</strong> digital ou facial hardware-based é praticamente impossível de falsificar.</li>
        <li><strong>Não depende de rede de dados:</strong> muitos modelos funcionam offline e sincronizam depois.</li>
        <li><strong>Sensação de "oficial":</strong> alguns funcionários só batem se é em equipamento físico. Questão cultural.</li>
      </ul>

      <h2>Desvantagens do ponto biométrico</h2>
      <ul>
        <li><strong>Custo de entrada alto:</strong> multiplicado por cada unidade/filial.</li>
        <li><strong>Instalação e infra:</strong> precisa de técnico, tomada, rede, espaço.</li>
        <li><strong>Quebra e manutenção:</strong> equipamento físico eventualmente quebra. Custo de reposição sempre volta.</li>
        <li><strong>Não cobre equipe externa:</strong> se sua empresa tem vendedor, entregador, obra — não resolve.</li>
        <li><strong>Filas no horário de pico:</strong> 30 funcionários querendo bater ponto às 8h formam uma fila real.</li>
      </ul>

      <h2>Vantagens do ponto digital</h2>
      <ul>
        <li><strong>Zero investimento inicial:</strong> só mensalidade por usuário.</li>
        <li><strong>Escalabilidade instantânea:</strong> adicionou 10 funcionários? Paga 10 a mais, sem comprar hardware.</li>
        <li><strong>Atende todos os cenários:</strong> matriz, filial, home office, equipe externa, obra. Tudo em uma conta.</li>
        <li><strong>Dashboard em tempo real:</strong> gestor vê no celular quem está trabalhando agora.</li>
        <li><strong>Atualizações automáticas:</strong> sem visitas de técnico. Updates acontecem em segundo plano.</li>
        <li><strong>Zero manutenção:</strong> nada pra quebrar.</li>
      </ul>

      <h2>Desvantagens do ponto digital</h2>
      <ul>
        <li><strong>Depende de celular com câmera e GPS:</strong> quase universal em 2026, mas ainda exige que o funcionário tenha o dispositivo.</li>
        <li><strong>Reconhecimento facial por software:</strong> menos preciso que biometria dedicada em hardware (mas suficiente pra maioria dos casos quando combinado com GPS + foto).</li>
        <li><strong>Depende de internet no momento da batida:</strong> sistemas modernos têm modo offline, mas é uma consideração.</li>
      </ul>

      <h2>Como escolher entre biométrico e digital</h2>
      <p>Não é uma decisão de "melhor ou pior" — é sobre cenário. Use essas regras:</p>
      <h3>Escolha ponto biométrico se:</h3>
      <ul>
        <li>Você tem operação 100% presencial em um único local (ex: fábrica, loja pequena).</li>
        <li>Celulares são restritos na operação (linha de produção, laboratório).</li>
        <li>Você já tem um relógio biométrico instalado e funcionando e não quer trocar.</li>
      </ul>
      <h3>Escolha ponto digital se:</h3>
      <ul>
        <li>Você tem equipes externas, remotas, ou múltiplas unidades.</li>
        <li>Você quer evitar investimento em hardware.</li>
        <li>Você precisa escalar rápido.</li>
        <li>Você quer um dashboard centralizado de tudo em tempo real.</li>
        <li>Sua empresa cresce ou muda de endereço com frequência.</li>
      </ul>

      <h2>E se eu quiser os dois?</h2>
      <p>Dá pra combinar. Alguns sistemas de ponto digital (como o WorkID) aceitam integração com relógios biométricos existentes. Assim você mantém o equipamento na recepção pra quem trabalha na sede, e o app pra quem está em campo. O dashboard fica unificado.</p>

      <h2>Conclusão</h2>
      <p>Em 2026, a tendência clara é migrar pro <strong>ponto digital</strong>, mesmo em operações que antes eram 100% biométricas. O custo menor, a flexibilidade e a capacidade de atender cenários que o biométrico simplesmente não resolve fazem o digital vencer na maioria dos casos. Mas biométrico ainda tem seu lugar — principalmente em operações industriais estáveis e confinadas.</p>
      <p>Se você está em dúvida, comece com o digital: o investimento é zero, o teste é grátis, e você consegue ver se atende antes de gastar um real. Veja também <a href="/blog/como-implantar-ponto-digital-7-dias">como implantar em 7 dias</a>.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Teste o ponto digital sem investir em hardware</p>
        <p>14 dias grátis no WorkID, sem cartão de crédito. Depois só R$ 9,90 por funcionário.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "adicional-noturno-como-calcular-clt-2026",
    title: "Adicional noturno: como calcular pela CLT em 2026 (com exemplos)",
    description:
      "Entenda como calcular o adicional noturno na CLT, qual o percentual mínimo, hora reduzida noturna e exemplos práticos para urbano e rural em 2026.",
    date: "2026-05-04",
    readTime: "9 min",
    category: "Guia Prático",
    tags: ["adicional noturno", "CLT", "folha de pagamento", "jornada"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que é o adicional noturno</h2>
      <p>O <strong>adicional noturno</strong> é o acréscimo obrigatório no salário-hora do colaborador que trabalha em horário considerado noturno pela CLT. A lei reconhece que o trabalho à noite é mais desgastante e exige uma compensação financeira mínima.</p>
      <p>Esse adicional é cumulativo com hora extra, adicional de insalubridade e outros benefícios — ou seja: se o funcionário fizer hora extra à noite, ele recebe os dois adicionais aplicados sobre o mesmo período.</p>

      <h2>Qual o horário noturno pela CLT</h2>
      <p>O horário noturno depende da atividade:</p>
      <ul>
        <li><strong>Urbano (art. 73 da CLT):</strong> das <strong>22h às 5h</strong>.</li>
        <li><strong>Rural na lavoura:</strong> das <strong>21h às 5h</strong>.</li>
        <li><strong>Rural na pecuária:</strong> das <strong>20h às 4h</strong>.</li>
      </ul>
      <p>Quem trabalha parte do turno em horário noturno tem direito ao adicional apenas sobre as horas trabalhadas dentro daquele intervalo.</p>

      <h2>Qual o percentual mínimo do adicional noturno</h2>
      <p>A CLT garante <strong>20% mínimo</strong> sobre a hora normal para trabalhadores urbanos. Convenções coletivas podem aumentar esse percentual (alguns sindicatos negociam 25%, 30% ou mais). Para trabalhadores rurais, o adicional é de <strong>25%</strong>.</p>

      <h2>Hora noturna reduzida: o detalhe que muita gente esquece</h2>
      <p>A CLT considera que cada hora noturna no horário urbano dura apenas <strong>52 minutos e 30 segundos</strong> em vez dos 60 minutos convencionais. Isso significa que, em 7 horas trabalhadas das 22h às 5h, o funcionário recebe como se tivesse trabalhado 8 horas. Esse cálculo é feito automaticamente em sistemas de <a href="/blog/o-que-e-ponto-digital-como-funciona">ponto digital</a> bem configurados.</p>

      <h2>Como calcular o adicional noturno passo a passo</h2>
      <p>Para um colaborador urbano com salário de R$ 2.200 e jornada de 220 horas/mês que trabalhou 4 horas no horário noturno:</p>
      <ol>
        <li><strong>Hora normal:</strong> R$ 2.200 ÷ 220 = R$ 10,00.</li>
        <li><strong>Adicional noturno (20%):</strong> R$ 10,00 × 0,20 = R$ 2,00 por hora.</li>
        <li><strong>Hora noturna ajustada:</strong> R$ 10,00 + R$ 2,00 = R$ 12,00.</li>
        <li><strong>Total das 4 horas noturnas:</strong> R$ 12,00 × 4 = R$ 48,00.</li>
      </ol>
      <p>Se essas 4 horas também forem extras (acima da jornada contratada), você soma o adicional de hora extra (mínimo 50%) <em>sobre a hora já com adicional noturno</em>. Esse cálculo composto é uma das fontes mais comuns de erros em folha. Veja também <a href="/blog/como-calcular-hora-extra-clt">como calcular hora extra pela CLT</a>.</p>

      <h2>Adicional noturno em jornadas especiais</h2>
      <p>Em escalas como a <a href="/blog/jornada-12x36-como-funciona-controle-ponto">12x36</a>, o adicional incide sobre todas as horas trabalhadas dentro do horário noturno. Já em jornadas 6x1 ou 5x2, o cálculo segue a regra geral.</p>

      <h2>O que diz o eSocial</h2>
      <p>No eSocial, o adicional noturno deve ser informado no evento S-1010 (rubricas) com a natureza correta. Se sua empresa ainda calcula manualmente, há risco real de inconsistência entre folha e eSocial — o que gera notificação e multa.</p>

      <h2>Como o WorkID calcula o adicional noturno automaticamente</h2>
      <p>O WorkID identifica automaticamente quais horas foram trabalhadas dentro do intervalo noturno (urbano ou rural) e aplica o adicional correto, incluindo a hora reduzida. O <a href="/blog/banco-de-horas-como-calcular-gerenciar">espelho de ponto</a> mostra cada hora separadamente: noturna, extra noturna, e normal — pronto pro contador.</p>

      <h2>Conclusão</h2>
      <p>O adicional noturno parece simples, mas o cálculo composto com hora extra e a hora noturna reduzida pegam muita empresa de surpresa. Automatizar isso evita erros, reduz risco trabalhista e economiza horas do RH.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Pare de calcular adicional noturno na mão</p>
        <p>O WorkID identifica e calcula automaticamente todos os adicionais — noturno, hora extra, DSR. Teste 14 dias grátis.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "espelho-de-ponto-o-que-e-como-ler",
    title: "Espelho de ponto: o que é, como ler e por que é obrigatório",
    description:
      "Entenda o que é o espelho de ponto, como interpretar cada coluna, qual a diferença pra folha de ponto e por que ele protege empresa e funcionário.",
    date: "2026-05-02",
    readTime: "8 min",
    category: "Guia",
    tags: ["espelho de ponto", "controle de ponto", "RH", "Portaria 671"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que é espelho de ponto</h2>
      <p>O <strong>espelho de ponto</strong> é o documento que consolida toda a jornada de trabalho de um colaborador em determinado período (geralmente o mês). Ele mostra dia a dia: entradas, saídas, intervalos, horas trabalhadas, faltas, atrasos, hora extra, banco de horas e qualquer ocorrência registrada.</p>
      <p>Diferente da batida individual, o espelho é o "extrato" da jornada — o documento que vai pro contador, pra fiscalização, e que serve de prova em caso de reclamação trabalhista.</p>

      <h2>Espelho de ponto vs folha de ponto: qual a diferença</h2>
      <ul>
        <li><strong>Folha de ponto:</strong> o formulário onde o funcionário ASSINA suas marcações (geralmente em papel). É o documento "bruto".</li>
        <li><strong>Espelho de ponto:</strong> o relatório CALCULADO a partir das marcações. Mostra totalizadores, saldo de banco de horas, faltas, etc. É o documento "tratado".</li>
      </ul>
      <p>Em sistemas de <a href="/blog/o-que-e-ponto-digital-como-funciona">ponto digital</a>, os dois se fundem: as batidas ficam no banco de dados (com geolocalização e foto) e o espelho é gerado em PDF a partir delas.</p>

      <h2>Como ler um espelho de ponto: as colunas explicadas</h2>
      <p>Um espelho profissional traz, por dia trabalhado:</p>
      <ul>
        <li><strong>Data e dia da semana</strong> — referência cronológica.</li>
        <li><strong>Marcações (E1, S1, E2, S2…):</strong> pares de entrada e saída. E1/S1 normalmente é o turno principal; E2/S2 o retorno do almoço.</li>
        <li><strong>Trabalhado:</strong> total de horas trabalhadas no dia.</li>
        <li><strong>Meta (jornada):</strong> quanto o funcionário deveria trabalhar naquele dia.</li>
        <li><strong>Saldo:</strong> diferença entre trabalhado e meta. Positivo vira hora extra ou crédito; negativo vira débito.</li>
        <li><strong>Status:</strong> normal, falta, ausência justificada, feriado, atestado.</li>
      </ul>

      <h2>Quem é obrigado a manter espelho de ponto</h2>
      <p>Pela CLT e pela <a href="/blog/portaria-671-controle-de-ponto">Portaria 671</a>, empresas com mais de 20 funcionários precisam ter controle de jornada e, portanto, gerar espelho. Mas mesmo empresas menores ganham proteção jurídica ao manter espelho organizado — em uma reclamação trabalhista, a falta de espelho geralmente faz o juiz aceitar as horas alegadas pelo funcionário.</p>

      <h2>Por quanto tempo guardar o espelho de ponto</h2>
      <p>O prazo prescricional trabalhista é de <strong>5 anos durante o contrato + 2 anos após o término</strong>. Na prática, recomendamos guardar por <strong>5 anos</strong> de forma acessível e até <strong>10 anos</strong> arquivado. Sistemas digitais cumprem isso automaticamente.</p>

      <h2>Funcionário precisa assinar o espelho de ponto?</h2>
      <p>A assinatura mensal do funcionário no espelho é uma boa prática que dá força jurídica máxima. Em papel, é literal. No digital, vira <strong>assinatura eletrônica</strong> com confirmação de senha + IP + carimbo de tempo. O WorkID tem um <a href="/blog/quanto-custa-sistema-ponto-eletronico-digital">fluxo de fechamento mensal</a> em que o admin gera o espelho, o funcionário revisa e confirma com senha — gerando um documento com validade legal.</p>

      <h2>Erros mais comuns em espelho de ponto</h2>
      <ul>
        <li>Marcações faltantes (a famosa "ponte" entre entrada e saída sem intervalo registrado).</li>
        <li>Hora noturna não destacada (perde 20% que devia ter pago).</li>
        <li>Falta sem justificativa marcada como "presente" — vira hora extra fantasma.</li>
        <li>Não bater o saldo de banco de horas com o que foi pago.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>Espelho de ponto não é burocracia — é o seu seguro contra disputas trabalhistas e a base pra uma folha de pagamento correta. Em sistemas modernos, ele é gerado automaticamente, revisado pelo funcionário e arquivado por anos sem esforço.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Espelho de ponto completo, em 1 clique</p>
        <p>O WorkID gera o espelho em PDF, com assinatura digital do funcionário e validade jurídica. Teste 14 dias grátis.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "geofencing-controle-de-ponto-como-funciona",
    title: "Geofencing no controle de ponto: o que é e como funciona",
    description:
      "Geofencing é a tecnologia que cria cercas virtuais por GPS para validar onde o ponto é batido. Saiba como funciona, vantagens e cuidados na implantação.",
    date: "2026-04-30",
    readTime: "7 min",
    category: "Tecnologia",
    tags: ["geofencing", "GPS", "controle de ponto", "tecnologia"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que é geofencing</h2>
      <p><strong>Geofencing</strong> (ou "cerca virtual") é uma tecnologia que define uma área geográfica delimitada por coordenadas GPS. Quando combinada com controle de ponto, ela permite que o sistema só aceite a batida se o funcionário estiver dentro da área autorizada.</p>
      <p>É o mesmo princípio que o iFood usa pra mostrar restaurantes próximos, ou que a Uber usa pra calcular trajeto: latitude e longitude, com um raio em volta.</p>

      <h2>Como o geofencing funciona no ponto eletrônico</h2>
      <p>Em sistemas como o WorkID, o admin cadastra:</p>
      <ul>
        <li><strong>Coordenadas centrais</strong> da empresa (ou múltiplos locais para equipes externas).</li>
        <li><strong>Raio aceito</strong> em metros (geralmente 50m a 200m).</li>
      </ul>
      <p>Quando o colaborador abre o app pra bater o ponto, o celular envia a posição GPS. O sistema calcula a distância até o ponto central — se estiver dentro do raio, libera. Se estiver fora, bloqueia ou solicita justificativa, dependendo da configuração.</p>

      <h2>Diferença entre geolocalização simples e geofencing</h2>
      <ul>
        <li><strong>Geolocalização simples:</strong> registra onde o ponto foi batido (pra auditoria), mas aceita qualquer local.</li>
        <li><strong>Geofencing:</strong> restringe ATIVAMENTE onde a batida pode acontecer. Mais rigoroso.</li>
      </ul>
      <p>Pra empresa com risco de fraude, geofencing é essencial. Pra empresa com equipe de campo (vendedores, técnicos, motoristas), pode ser flexibilizado por rota ou liberado.</p>

      <h2>Precisão do GPS: o que esperar</h2>
      <p>O GPS de celulares modernos tem precisão de 5 a 20 metros em ambiente externo. Em ambiente fechado (dentro de prédios), a precisão pode cair pra 50-100m. Por isso é importante calibrar o raio de geofencing com folga — não use 30m em escritório dentro de shopping center.</p>
      <p>Saiba mais em <a href="/blog/ponto-eletronico-gps-como-funciona-legal">ponto eletrônico por GPS: como funciona e é legal</a>.</p>

      <h2>Vantagens do geofencing</h2>
      <ul>
        <li><strong>Reduz drasticamente fraudes</strong> de "bater ponto pelo amigo" remotamente.</li>
        <li><strong>Garante presença real</strong> no local de trabalho.</li>
        <li><strong>Permite múltiplos locais</strong> (matriz, filiais, obras, clientes).</li>
        <li><strong>Auditável:</strong> cada batida traz a coordenada exata, gravada pra sempre.</li>
      </ul>

      <h2>Cuidados na implantação</h2>
      <p>Geofencing não é "ligou e funciona". Atenção a:</p>
      <ul>
        <li><strong>Permissão de localização:</strong> o funcionário precisa autorizar GPS no celular. No iOS isso requer dar permissão "ao usar o app" mais explicitamente.</li>
        <li><strong>Raio adequado:</strong> muito apertado = falsos negativos; muito largo = perde o propósito.</li>
        <li><strong>Equipes externas:</strong> ajuste pra cada local de trabalho (obra, casa do cliente, etc.) ou libere ponto livre com justificativa.</li>
        <li><strong>Modo offline:</strong> se o funcionário ficar sem internet, o sistema deve guardar a batida com geolocalização e sincronizar depois.</li>
      </ul>

      <h2>Geofencing é legal?</h2>
      <p>Sim. A <a href="/blog/portaria-671-controle-de-ponto">Portaria 671</a> permite o uso de GPS como mecanismo de validação. A <a href="/blog/ponto-eletronico-lgpd-o-que-saber">LGPD</a> exige apenas que o funcionário seja informado de que sua localização está sendo coletada (transparência) e que o dado seja usado só pra finalidade declarada.</p>

      <h2>Conclusão</h2>
      <p>Geofencing é a peça que separa controle de ponto sério de controle de ponto fingido. Combinado com <a href="/blog/reconhecimento-facial-ponto-vale-a-pena">reconhecimento facial</a> ou foto da câmera, gera uma trilha de auditoria praticamente inviolável. Em 2026, é o padrão pra empresas que levam controle de jornada a sério.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Geofencing nativo, configuração em 1 minuto</p>
        <p>WorkID já vem com cerca virtual configurável por funcionário. Defina raio, locais adicionais e libere ponto livre quando precisar. 14 dias grátis.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "ponto-eletronico-construcao-civil-obra",
    title: "Ponto eletrônico para construção civil e obras: guia completo",
    description:
      "Como controlar o ponto de operários em obras com múltiplos canteiros, equipes externas e rotatividade alta. Guia prático para empresas da construção.",
    date: "2026-04-28",
    readTime: "9 min",
    category: "Guia",
    tags: ["construção civil", "obra", "ponto digital", "equipe externa"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>Por que controlar o ponto na obra é diferente</h2>
      <p>A construção civil tem características que tornam o controle de jornada particularmente complicado: <strong>múltiplos canteiros</strong>, <strong>equipes que trocam de obra</strong>, <strong>conexão de internet ruim no local</strong>, <strong>operários sem PC</strong>, e uma <strong>rotatividade altíssima</strong>. Sistemas tradicionais de relógio biométrico simplesmente não cabem.</p>

      <h2>Os erros que custam caro na construção</h2>
      <ul>
        <li><strong>Anotação manual em cadernos:</strong> rasura, esquecimento, contestação na justiça.</li>
        <li><strong>Ponto pelo encarregado:</strong> conflito de interesse, fácil de fraudar.</li>
        <li><strong>Sem prova de presença em obras externas:</strong> reclamação trabalhista de "estive na obra X" sem refutação.</li>
      </ul>
      <p>Cada um desses pontos pode virar processo trabalhista que custa de R$ 5 mil a R$ 50 mil por funcionário.</p>

      <h2>O que sua solução de ponto precisa ter para construção civil</h2>
      <ol>
        <li><strong>Ponto pelo celular do operário:</strong> sem necessidade de hardware no canteiro.</li>
        <li><strong>Múltiplos locais autorizados:</strong> cada obra com sua <a href="/blog/geofencing-controle-de-ponto-como-funciona">cerca virtual</a> própria.</li>
        <li><strong>Modo offline:</strong> funciona mesmo onde a internet falha; sincroniza quando conectar.</li>
        <li><strong><a href="/blog/reconhecimento-facial-ponto-vale-a-pena">Reconhecimento facial</a> ou totem na entrada:</strong> evita "bater ponto pelo amigo".</li>
        <li><strong>Cadastro rápido de novos operários:</strong> rotatividade alta exige onboarding em minutos.</li>
        <li><strong>Acesso pelo celular sem instalar app:</strong> PWA simplifica imensamente.</li>
      </ol>

      <h2>Como o WorkID resolve cada problema</h2>
      <p>O WorkID foi desenhado pra cenários distribuídos. No setor de construção civil você consegue:</p>
      <ul>
        <li>Cadastrar cada obra como <strong>local adicional</strong>; o operário bate ponto em qualquer uma sem reconfigurar nada.</li>
        <li>Usar o <strong>Modo Totem</strong> em um tablet barato na entrada da obra principal — operário olha pra câmera, sistema reconhece pelo rosto e bate o ponto. Sem digitar senha.</li>
        <li>Liberar <strong>ponto livre</strong> para encarregados ou medidores que circulam entre obras.</li>
        <li>Gerar <strong>folha de ponto consolidada</strong> por obra (importante pra fechamento contábil de cada empreendimento).</li>
      </ul>

      <h2>Custos: cabe no bolso da construtora pequena?</h2>
      <p>Sim. A maior dor de quem está começando é o investimento inicial. Como sistemas digitais não exigem hardware, você paga só pelo software por funcionário. <a href="/blog/quanto-custa-sistema-ponto-eletronico-digital">Veja a faixa de preços</a>: a partir de R$ 9,90/funcionário/mês. Numa obra com 15 operários, são R$ 148,50/mês — menos do que uma diária de pedreiro.</p>

      <h2>Como adequar a obra à <a href="/blog/portaria-671-controle-de-ponto">Portaria 671</a></h2>
      <p>O REP-P (programa de registro) é o tipo certo pra construção civil — não exige relógio físico, aceita ponto pelo celular e cumpre todas as exigências de inviolabilidade e <a href="/blog/ponto-eletronico-gps-como-funciona-legal">geolocalização</a>. Em fiscalização, o que importa é mostrar:</p>
      <ul>
        <li>Espelho de ponto consolidado por funcionário, mês a mês.</li>
        <li>Comprovante de cada batida (fica salvo automaticamente no sistema).</li>
        <li>Arquivo Fonte de Dados (AFD) gerado pelo sistema, no formato do MTE.</li>
      </ul>

      <h2>Plano de implantação em obra</h2>
      <ol>
        <li><strong>Semana 1:</strong> cadastrar canteiros e funcionários atuais. Treinar encarregados.</li>
        <li><strong>Semana 2:</strong> rodar paralelo (mantém método antigo e o novo simultâneos).</li>
        <li><strong>Semana 3:</strong> migrar 100%. Conferir folha de pagamento batendo com o sistema.</li>
        <li><strong>Mês 2:</strong> usar relatórios pra entender padrões — atrasos, faltas, hora extra por equipe ou empreitada.</li>
      </ol>
      <p>Veja também: <a href="/blog/como-implantar-ponto-digital-7-dias">como implantar ponto digital em 7 dias</a>.</p>

      <h2>Conclusão</h2>
      <p>Construção civil sofre demais com controle de ponto manual. Migrar pra digital reduz risco trabalhista, melhora a relação com fiscalização e dá visibilidade real do que acontece em cada obra. E não custa caro.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Construtora? Teste o WorkID em 1 obra primeiro</p>
        <p>14 dias grátis, cadastra uma obra-piloto e vê como o controle fica. Depois replica nas outras.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "ponto-eletronico-restaurantes-bares",
    title: "Ponto eletrônico para restaurantes e bares: o guia 2026",
    description:
      "Restaurante e bar têm escalas, hora extra constante e muita rotatividade. Veja como o ponto digital simplifica o RH e cumpre a CLT no setor de food service.",
    date: "2026-04-26",
    readTime: "8 min",
    category: "Guia",
    tags: ["restaurante", "bar", "food service", "ponto digital"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>Por que restaurante e bar precisam de ponto bem feito</h2>
      <p>Quem opera restaurante ou bar conhece o cenário: <strong>turnos mistos</strong>, <strong>extras constantes</strong>, <strong>fechamento depois da meia-noite</strong> (e adicional noturno!), <strong>folguistas que cobrem feriado</strong>, e uma rotatividade que assusta. Sem controle de ponto sério, você convida três coisas: erro de folha, dívida trabalhista e fiscalização.</p>

      <h2>Os 5 problemas mais comuns no setor</h2>
      <ol>
        <li><strong>Adicional noturno não calculado:</strong> turno fecha às 1h da manhã e ninguém pagou os 20% sobre as horas após 22h. Veja <a href="/blog/adicional-noturno-como-calcular-clt-2026">como calcular adicional noturno</a>.</li>
        <li><strong>Hora extra paga errado:</strong> 50% sobre hora normal vira 50% sobre hora cheia (sem adicional noturno embutido) — pagamento a maior ou a menor.</li>
        <li><strong>Intervalo intrajornada não controlado:</strong> CLT exige 1h pra jornada acima de 6h; bar quase nunca tem isso bem registrado.</li>
        <li><strong>Folga em feriado misturada:</strong> compensação não controlada, vira processo.</li>
        <li><strong>Funcionário "fantasma" no caixa:</strong> ponto batido pelo gerente pra cobrir falta.</li>
      </ol>

      <h2>O que ponto digital muda no dia a dia</h2>
      <ul>
        <li><strong>Bate ponto no celular do funcionário:</strong> sem fila no relógio, sem cartão pra perder.</li>
        <li><strong>Confere foto e GPS:</strong> impossível bater ponto em casa fingindo que tá no estabelecimento.</li>
        <li><strong>Adicional noturno calculado automaticamente:</strong> sistema identifica horas após 22h e aplica os 20%.</li>
        <li><strong>Folguistas com escala definida:</strong> a jornada de cada um pode ter escalas diferentes (6x1, 5x2, etc.).</li>
        <li><strong>Modo Totem na entrada:</strong> tablet com reconhecimento facial pra quem prefere central.</li>
      </ul>

      <h2>Casos de uso reais em food service</h2>
      <h3>1. Garçons em restaurante com filial</h3>
      <p>Cada filial tem seu local cadastrado com cerca virtual. O garçom é único no sistema, mas pode bater ponto na filial onde está trabalhando naquele dia (Centro ou Shopping). Folha consolidada por colaborador, custo separado por filial.</p>
      <h3>2. Cozinheiros em jornada noturna</h3>
      <p>Entram às 18h, saem às 2h. Sistema identifica que 4 horas (22h às 2h) são noturnas e aplica os 20% automaticamente. Espelho de ponto separa: 8h trabalhadas, sendo 4h normais e 4h noturnas.</p>
      <h3>3. Bartender com escala 5x2</h3>
      <p>Define-se a escala (segunda a sexta, 18h às 2h). Sistema sabe quais dias são folga; não cobra ponto nos dias livres.</p>

      <h2>Modo Totem na entrada do restaurante</h2>
      <p>Coloca um tablet velho na entrada da cozinha. Funcionário chega, olha pra câmera, sistema reconhece o rosto e bate o ponto. Sem digitar nada. Saída idem. Custa zero a mais e elimina 90% do problema de fraude. Veja como funciona o <a href="/blog/reconhecimento-facial-ponto-vale-a-pena">reconhecimento facial no ponto</a>.</p>

      <h2>Quanto custa pra uma operação de 10-15 funcionários</h2>
      <p>Plano Professional do WorkID: R$ 99,90 fixos + R$ 9,90 por funcionário extra acima do incluído. Pra 15 colaboradores: aprox. R$ 150-180/mês. Menos do que uma diária de cozinheiro. <a href="/blog/quanto-custa-sistema-ponto-eletronico-digital">Compare com outros sistemas</a>.</p>

      <h2>Conformidade com a Portaria 671</h2>
      <p>Sistemas como o WorkID atendem ao REP-P, gerando AFD e relatórios prontos pra fiscalização. A <a href="/blog/portaria-671-controle-de-ponto">Portaria 671</a> permite ponto pelo celular desde que tenha inviolabilidade e comprovante. Tudo isso vem nativo.</p>

      <h2>Conclusão</h2>
      <p>Restaurante e bar são exatamente o tipo de operação que mais sofre com ponto manual e mais ganha com digital. Adicional noturno automático e cálculo correto de hora extra já pagam o sistema em duas folhas. E o mais importante: dorme tranquilo nas vésperas de fiscalização do MTE.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Restaurante ou bar? Teste antes de fechar a folha do mês</p>
        <p>14 dias grátis. Cadastra a equipe atual e vê o adicional noturno calculado correto antes da próxima folha.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "como-provar-horas-extras-justica-do-trabalho",
    title: "Como provar horas extras na Justiça do Trabalho (2026)",
    description:
      "Saiba como provar horas extras em uma reclamação trabalhista, quais são as evidências aceitas e como o ponto eletrônico digital protege empresa e funcionário.",
    date: "2026-04-24",
    readTime: "9 min",
    category: "Legislação",
    tags: ["horas extras", "justiça do trabalho", "prova", "CLT"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O ônus da prova nas horas extras</h2>
      <p>Pela Súmula 338 do TST, em empresas com mais de 20 funcionários, a obrigação de manter o controle de jornada é do <strong>empregador</strong>. Quando o empregador não apresenta os registros, presume-se verdadeira a jornada alegada pelo funcionário na petição inicial. Em outras palavras: <strong>se você não tem ponto, perde por omissão</strong>.</p>

      <h2>O que conta como prova de horas extras</h2>
      <p>Em ordem decrescente de força jurídica:</p>
      <ol>
        <li><strong>Espelho de ponto eletrônico</strong> com inviolabilidade — registros impossíveis de adulterar a posteriori.</li>
        <li><strong>Folha de ponto assinada pelo funcionário</strong> ao final do mês.</li>
        <li><strong>E-mails, mensagens de WhatsApp</strong> trocados com gestor mostrando trabalho fora do horário.</li>
        <li><strong>Testemunhas:</strong> colegas que viram a jornada efetivamente cumprida.</li>
        <li><strong>Anotações pessoais do funcionário:</strong> caderno, agenda — força fraca, mas pode ajudar.</li>
      </ol>

      <h2>Como o juiz analisa o ponto eletrônico</h2>
      <p>O juiz olha três coisas:</p>
      <ul>
        <li><strong>Inviolabilidade:</strong> o sistema permite adulterar batida sem deixar log? Se sim, perde força.</li>
        <li><strong>Comprovante:</strong> o funcionário recebia comprovação de cada batida?</li>
        <li><strong>Aderência à <a href="/blog/portaria-671-controle-de-ponto">Portaria 671</a>:</strong> sistema gera AFD, atende REP-P, etc.</li>
      </ul>
      <p>Sistemas que cumprem tudo são raramente questionados. Os que não cumprem, viram bola de neve em audiência.</p>

      <h2>O perigo do ponto britânico</h2>
      <p>"Ponto britânico" é a marcação SEM variação — todo dia entra 8h, saí às 18h, mesmo a hora exata. Juízes consideram isso indício de fraude (impossível na prática). A jurisprudência diz que esse ponto é "imprestável" e o funcionário pode alegar a jornada que quiser. Sistemas digitais resolvem isso registrando a hora exata da batida.</p>

      <h2>Hora extra "tácita" e supressão de horas</h2>
      <p>Mesmo quando a empresa afirma não autorizar hora extra, se o funcionário trabalhou e a empresa <em>tolerou</em>, há direito ao pagamento. Provas dessa "hora extra tácita" incluem:</p>
      <ul>
        <li>Mensagens de chefia respondendo fora do expediente.</li>
        <li>Tarefas atribuídas com prazo que exigia overtime.</li>
        <li>Login no sistema da empresa após horário (logs de servidor).</li>
      </ul>

      <h2>Dispensa de controle de ponto: cuidado</h2>
      <p>Cargo de gestão (art. 62, II da CLT) não tem direito a hora extra — mas a interpretação é restritiva. O funcionário precisa ter <strong>poder real de mando, gestão e fidúcia</strong>. Não basta ter o cargo "Gerente" no contracheque. Em audiência, o juiz pergunta: você contratava? demitia? definia salários? Se a resposta for "não", há hora extra a pagar.</p>

      <h2>Banco de horas: prova de quitação</h2>
      <p>Se você tem banco de horas com seu funcionário, deve provar dois pontos:</p>
      <ol>
        <li>Existência do acordo (convenção coletiva ou individual escrito).</li>
        <li>Compensação efetivamente realizada — quando, qual saldo, qual hora compensou qual.</li>
      </ol>
      <p>Sem isso, o saldo positivo vira hora extra pura. Veja <a href="/blog/banco-de-horas-como-calcular-gerenciar">como calcular e gerenciar banco de horas</a>.</p>

      <h2>Como o ponto digital protege a empresa</h2>
      <ul>
        <li>Cada batida tem geolocalização e foto: prova de PRESENÇA, não só de marcação.</li>
        <li>Inviolabilidade nativa: o histórico de alterações é registrado.</li>
        <li>Espelho de ponto com <strong>assinatura digital do funcionário</strong> mensal: o juiz adora ver.</li>
        <li>AFD pronto pra entrega em fiscalização.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>Em 2026, defender uma reclamação de horas extras sem ponto eletrônico digital é defender no escuro. Investir em controle sério custa pouco e economiza muito na justiça — empresa que tem o registro raramente precisa pagar reclamação, e quando precisa, paga só o que realmente é devido.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Não defenda processo trabalhista no escuro</p>
        <p>WorkID guarda 5+ anos de histórico, com geolocalização e assinatura digital. Comece a se proteger hoje.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "multas-trabalhistas-ponto-incorreto-2026",
    title: "Multas trabalhistas por ponto incorreto: o guia 2026",
    description:
      "Quanto custa uma fiscalização do MTE encontrar irregularidades no ponto? Veja as multas mais comuns, valores e como evitar com sistema digital.",
    date: "2026-04-22",
    readTime: "8 min",
    category: "Legislação",
    tags: ["multas trabalhistas", "MTE", "fiscalização", "compliance"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que a fiscalização do MTE procura</h2>
      <p>Quando um Auditor Fiscal do Trabalho aparece na sua empresa, ele tem um checklist específico para o controle de ponto. Os itens mais comuns:</p>
      <ul>
        <li>Existência de controle de jornada (obrigatório se mais de 20 funcionários).</li>
        <li>Aderência à <a href="/blog/portaria-671-controle-de-ponto">Portaria 671</a> (REP correto).</li>
        <li>Geração de AFD acessível.</li>
        <li>Pagamento correto de horas extras e adicionais.</li>
        <li>Respeito a intervalos intrajornada e interjornada.</li>
        <li>Limite legal de jornada.</li>
      </ul>

      <h2>As multas mais comuns e seus valores</h2>
      <p>As multas variam conforme o porte da empresa e a gravidade. Os valores abaixo são por funcionário/infração e refletem a tabela CLT:</p>
      <ul>
        <li><strong>Não manter controle de jornada:</strong> R$ 40,25 a R$ 4.025,00 por funcionário (art. 74, §2º + art. 47).</li>
        <li><strong>Sistema de ponto não atendendo Portaria 671:</strong> R$ 402,53 a R$ 4.025,33 por colaborador prejudicado.</li>
        <li><strong>Não pagar hora extra corretamente:</strong> dobro do valor devido + multa adicional.</li>
        <li><strong>Não conceder intervalo intrajornada:</strong> 50% sobre cada hora suprimida + multa.</li>
        <li><strong>Não respeitar interjornada (11h entre dois dias):</strong> hora extra + multa.</li>
        <li><strong>Adicional noturno não pago:</strong> retroativo de 5 anos + 50% de multa, mais correção monetária.</li>
      </ul>
      <p>O cálculo é por <strong>funcionário</strong>, não por empresa. Em uma fiscalização que pega 30 colaboradores irregulares, mesmo a multa "leve" multiplica.</p>

      <h2>O que aumenta a multa</h2>
      <ul>
        <li><strong>Reincidência:</strong> dobra automaticamente.</li>
        <li><strong>Falta de boa-fé:</strong> rasura, ponto britânico, testemunha mentindo.</li>
        <li><strong>Extensão temporal:</strong> mais tempo de irregularidade, mais alto o piso.</li>
      </ul>

      <h2>Como o sistema digital reduz risco de multa</h2>
      <ul>
        <li><strong>Inviolabilidade nativa</strong> elimina o "ponto britânico".</li>
        <li><strong>AFD pronto</strong> em segundos, gerado pelo sistema (não precisa terceirizar pra contador).</li>
        <li><strong>Cálculo automático</strong> de adicional noturno, hora extra e intervalos.</li>
        <li><strong>Auditoria por geolocalização e foto</strong> — defesa robusta contra alegações.</li>
      </ul>
      <p>Em fiscalização real, ter o sistema certo e o relatório à mão geralmente termina o processo em advertência. Sem sistema, vira auto de infração.</p>

      <h2>O custo invisível: ações trabalhistas</h2>
      <p>A multa do MTE é uma parte. A outra parte são as <strong>reclamações trabalhistas individuais</strong> que florescem quando a empresa tem ponto bagunçado. Cada uma costuma custar R$ 5 mil a R$ 50 mil em condenação + honorários, e até R$ 100 mil em casos extremos. Saiba <a href="/blog/como-provar-horas-extras-justica-do-trabalho">como o controle de ponto protege na justiça</a>.</p>

      <h2>Multa do eSocial</h2>
      <p>Independente do MTE, o eSocial tem multas próprias por inconsistência entre folha e jornada declarada. Tipicamente R$ 201,27 a R$ 402,54 por evento errado. Pra uma empresa com 40 funcionários e 12 meses de erro, vira R$ 96 mil só de eSocial.</p>

      <h2>Plano de adequação rápida</h2>
      <ol>
        <li><strong>Hoje:</strong> avaliar se sistema atual gera AFD e atende Portaria 671.</li>
        <li><strong>Esta semana:</strong> migrar pra sistema homologado (digital, REP-P).</li>
        <li><strong>Próximas 2 semanas:</strong> recalcular folhas dos últimos 5 anos pra ver passivo trabalhista oculto.</li>
        <li><strong>Próximo mês:</strong> rodar primeira folha 100% no sistema novo.</li>
      </ol>
      <p>Veja como <a href="/blog/como-implantar-ponto-digital-7-dias">implantar ponto digital em 7 dias</a>.</p>

      <h2>Conclusão</h2>
      <p>Não é "se" sua empresa será fiscalizada — é "quando". Empresas com ponto digital saem ilesas; empresas sem, pagam pesado. Investir R$ 100-300 por mês em um sistema decente é o melhor seguro contra multa e processo trabalhista que existe.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Pague R$ 99,90/mês e durma tranquilo</p>
        <p>Sistema homologado, AFD automático, espelho com assinatura digital. Teste 14 dias grátis no WorkID.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
  {
    slug: "fechamento-mensal-de-ponto-passo-a-passo",
    title: "Fechamento mensal de ponto: o passo a passo completo (2026)",
    description:
      "Aprenda a fazer o fechamento de ponto no fim do mês: revisão de batidas, correções, validação do funcionário, geração de espelho e envio para folha.",
    date: "2026-04-20",
    readTime: "8 min",
    category: "Guia Prático",
    tags: ["fechamento de ponto", "espelho", "folha de pagamento", "RH"],
    ogImage: "/images/og-image.png",
    content: `
      <h2>O que é o fechamento de ponto</h2>
      <p>O <strong>fechamento de ponto</strong> é o ritual mensal (ou quinzenal) em que o RH consolida todas as batidas do período, corrige inconsistências, totaliza horas trabalhadas, hora extra, banco de horas, faltas e ausências, e produz o <a href="/blog/espelho-de-ponto-o-que-e-como-ler">espelho de ponto</a> definitivo de cada funcionário. Esse espelho alimenta a folha de pagamento.</p>
      <p>Bem feito, vira rotina de 1-2 horas por mês. Mal feito, vira semana inteira de RH apagando incêndio.</p>

      <h2>Quando fazer o fechamento</h2>
      <p>Empresas costumam fechar:</p>
      <ul>
        <li>Do <strong>dia 26 ao 25 do mês seguinte</strong> (mais comum).</li>
        <li>Do <strong>dia 21 ao 20</strong>.</li>
        <li>Do <strong>dia 1 ao último dia</strong> do mês (mais simples, mas exige folha mais rápida).</li>
      </ul>
      <p>O período influencia a data limite pro RH conseguir gerar a folha a tempo do pagamento. Não tem fórmula mágica — escolhe o que dá folga pro time.</p>

      <h2>Passo a passo do fechamento</h2>
      <h3>1. Revisão de batidas faltantes (dia 1 do fechamento)</h3>
      <p>Olhe o relatório de pendências: dias com menos batidas que o esperado, justificativas faltantes, atestados não anexados. Corrija junto com cada gestor de área.</p>
      <h3>2. Validação de ausências e atestados</h3>
      <p>Confira cada ausência: tem documento anexado? Foi aprovada? O <a href="/blog/atestado-medico-digital-como-validar">atestado é válido</a>? Marca tudo no sistema.</p>
      <h3>3. Banco de horas e compensações</h3>
      <p>Veja o saldo do mês de cada um. Houve compensação contratada? Se sim, marca. <a href="/blog/banco-de-horas-como-calcular-gerenciar">Como calcular banco de horas corretamente</a>.</p>
      <h3>4. Hora extra autorizada</h3>
      <p>Hora extra não autorizada formalmente vira "tácita" e o juiz pode reconhecer. Documente cada hora extra com justificativa do gestor.</p>
      <h3>5. Geração do espelho preliminar</h3>
      <p>Sistema fecha o período (24h-48h antes) e gera espelho preview. RH revisa cada um, comparando com o que esperava.</p>
      <h3>6. Envio para validação do funcionário</h3>
      <p>Aqui é onde o ponto digital brilha. Em vez de imprimir e pedir assinatura, o funcionário recebe notificação no celular, abre o espelho, confirma com senha (assinatura digital) ou contesta com motivo. Tudo registrado.</p>
      <h3>7. Geração do espelho definitivo</h3>
      <p>Após confirmação, o sistema "trava" o espelho. Vira documento jurídico imutável (com IP, hora exata, evidência da senha).</p>
      <h3>8. Exportação para folha de pagamento</h3>
      <p>Sistema gera arquivo com totais de hora normal, hora extra (50% e 100%), adicional noturno, faltas, atrasos e DSR. Importa direto no software de folha (ou envia pro contador).</p>

      <h2>Os erros que mais quebram fechamento</h2>
      <ul>
        <li><strong>Adicional noturno esquecido</strong> em quem trabalhou após 22h. Veja <a href="/blog/adicional-noturno-como-calcular-clt-2026">como calcular adicional noturno</a>.</li>
        <li><strong>Compensação de banco com saldo errado</strong> — somar hora extra normal como se fosse banco.</li>
        <li><strong>Ausências em feriado</strong> contadas como faltas (deveria ser DSR pago).</li>
        <li><strong>Funcionário não recebe espelho</strong> — perde força jurídica.</li>
      </ul>

      <h2>Quanto tempo deveria levar</h2>
      <p>Empresa com 50 funcionários, sistema digital bem configurado: <strong>2 a 4 horas de RH/mês</strong>. Em sistemas manuais, é facilmente 20-30 horas pra mesma operação.</p>

      <h2>Assinatura digital do funcionário: o detalhe que importa</h2>
      <p>O passo onde o funcionário confirma o espelho com a senha é o que dá <strong>validade jurídica máxima</strong>. O sistema captura: usuário, IP, user-agent, data/hora UTC, e a evidência criptográfica de que a senha foi conferida. Em juízo, isso é prova fortíssima.</p>
      <p>Se o funcionário discordar, ele pode <strong>contestar</strong> com motivo escrito. RH revisa, ajusta se necessário, e refaz o ciclo.</p>

      <h2>Conclusão</h2>
      <p>Fechamento de ponto bem feito é a diferença entre folha tranquila e dor de cabeça mensal. Sistema digital corta 80% do trabalho manual, dá segurança jurídica e ainda gera o arquivo pronto pro contador. Investir em uma rotina robusta é o melhor uso de tempo que o RH pode fazer.</p>

      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
        <p style="font-size: 1.1rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">Fechamento mensal em 1 clique</p>
        <p>WorkID gera espelho com assinatura digital do funcionário e exporta pro contador. 14 dias grátis pra testar.</p>
        <a href="/signup" style="display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600;">Começar teste grátis &rarr;</a>
      </div>
    `,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}

export function getLatestPosts(count: number): BlogPost[] {
  return [...blogPosts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count);
}

export function getRelatedPosts(currentSlug: string, count: number): BlogPost[] {
  const current = blogPosts.find((p) => p.slug === currentSlug);
  if (!current) {
    return blogPosts.filter((post) => post.slug !== currentSlug).slice(0, count);
  }
  // Ordena pelos que mais compartilham tags/categoria com o atual
  return blogPosts
    .filter((p) => p.slug !== currentSlug)
    .map((p) => {
      const tagOverlap = p.tags.filter((t) => current.tags.includes(t)).length;
      const sameCategory = p.category === current.category ? 1 : 0;
      return { p, score: tagOverlap * 2 + sameCategory };
    })
    .sort((a, b) => b.score - a.score || new Date(b.p.date).getTime() - new Date(a.p.date).getTime())
    .slice(0, count)
    .map((x) => x.p);
}
