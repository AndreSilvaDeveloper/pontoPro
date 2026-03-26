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
      <p>A CLT exige que empresas com mais de 20 funcionários façam o controle de jornada. O ponto digital é uma das formas aceitas pela legislação, desde que o sistema esteja em conformidade com a <strong>Portaria 671</strong>.</p>
      <p>Mesmo empresas menores podem (e devem) adotar o ponto digital como forma de proteção jurídica e organização interna. Em disputas trabalhistas, ter registros completos e confiáveis faz toda a diferença.</p>

      <h2>Como escolher um sistema de ponto digital?</h2>
      <p>Na hora de escolher, avalie os seguintes critérios:</p>
      <ul>
        <li><strong>Facilidade de uso:</strong> O sistema precisa ser intuitivo tanto para gestores quanto para colaboradores.</li>
        <li><strong>Segurança:</strong> Busque soluções com GPS, reconhecimento facial e criptografia de dados.</li>
        <li><strong>Conformidade legal:</strong> Verifique se o sistema atende à Portaria 671.</li>
        <li><strong>Suporte:</strong> Ter um time de suporte acessível é fundamental para resolver dúvidas rapidamente.</li>
        <li><strong>Custo-benefício:</strong> Compare planos e funcionalidades. Nem sempre o mais barato é o mais econômico a longo prazo.</li>
      </ul>

      <h2>Conclusão</h2>
      <p>O ponto digital é a evolução natural do controle de jornada. Ele traz mais segurança, praticidade e conformidade legal para sua empresa, além de economizar tempo e dinheiro do departamento de RH.</p>
      <p>Se você busca uma solução moderna e confiável, o <strong>WorkID</strong> oferece ponto digital com GPS, reconhecimento facial, banco de horas automático e muito mais — tudo em uma plataforma simples e acessível.</p>

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
  return blogPosts.filter((post) => post.slug !== currentSlug).slice(0, count);
}
