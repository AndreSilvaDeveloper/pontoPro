# WorkID — Documentação Completa do Sistema

> Sistema SaaS de Gestão de Ponto Eletrônico com Biometria Facial, Geolocalização e controle multi-empresa.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Arquitetura do Projeto](#3-arquitetura-do-projeto)
4. [Banco de Dados (Prisma Schema)](#4-banco-de-dados-prisma-schema)
5. [Autenticação e Autorização](#5-autenticação-e-autorização)
6. [Páginas e Rotas](#6-páginas-e-rotas)
7. [API Routes (Backend)](#7-api-routes-backend)
8. [Componentes](#8-componentes)
9. [Hooks, Providers e Utilitários](#9-hooks-providers-e-utilitários)
10. [Sistema de Billing (Cobrança)](#10-sistema-de-billing-cobrança)
11. [Planos e Precificação](#11-planos-e-precificação)
12. [Sistema de Temas (Dark/Light)](#12-sistema-de-temas-darklight)
13. [PWA (Progressive Web App)](#13-pwa-progressive-web-app)
14. [Integrações Externas](#14-integrações-externas)
15. [Variáveis de Ambiente](#15-variáveis-de-ambiente)
16. [Fluxos Principais](#16-fluxos-principais)
17. [Papéis e Permissões](#17-papéis-e-permissões)

---

## 1. Visão Geral

O **WorkID** é um sistema SaaS completo de **ponto eletrônico** projetado para empresas de todos os portes. Ele oferece:

- **Registro de ponto** com GPS, reconhecimento facial (AWS Rekognition) e validação por IP
- **Gestão de funcionários** com jornadas personalizáveis, múltiplas lojas/filiais
- **Gestão de ausências** (férias, atestados, folgas, faltas) com aprovação pelo admin
- **Solicitações de ajuste** de ponto pelo funcionário, com fluxo de aprovação
- **Relatórios PDF/Excel** com cálculo automático de horas, extras e banco de horas
- **Dashboard em tempo real** com status dos funcionários (trabalhando, pausa, offline)
- **Painel SaaS (Super Admin)** para gestão multi-tenant (empresas, cobrança, impersonação)
- **Cobrança automática** via Asaas (PIX, boleto) com trial, vencimento e bloqueio
- **PWA instalável** no celular, com interface mobile-first

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Framework** | Next.js (App Router) | 16.0.7 |
| **Linguagem** | TypeScript | 5.x |
| **React** | React | 19.2.0 |
| **Estilização** | Tailwind CSS | 4.x |
| **UI Components** | Shadcn/ui + Radix UI | — |
| **Ícones** | Lucide React | 0.555.0 |
| **Banco de Dados** | PostgreSQL | — |
| **ORM** | Prisma | 5.19.1 |
| **Autenticação** | NextAuth.js (Credentials) | 4.24.13 |
| **Pagamento** | Asaas (PIX/Boleto) | API v3 |
| **Storage** | Vercel Blob | 2.0.0 |
| **Facial Recognition** | AWS Rekognition | SDK 3.x |
| **Email** | Resend | 6.6.0 |
| **Mapas** | Leaflet + React Leaflet | 1.9.4 / 5.0.0 |
| **Gráficos** | Recharts | 3.5.1 |
| **PDF** | jsPDF + AutoTable | 3.0.4 |
| **Excel** | SheetJS (xlsx) | 0.18.5 |
| **Webcam** | React Webcam | 7.2.0 |
| **Assinatura** | React Signature Canvas | 1.1.0 |
| **Tema** | next-themes | 0.4.6 |
| **Toast** | Sonner | 2.0.7 |
| **Onboarding** | Driver.js | 1.4.0 |
| **HTTP Client** | Axios | 1.13.2 |
| **Datas** | date-fns + date-fns-tz | 4.1.0 |
| **Hash** | bcryptjs | 3.0.3 |
| **Deploy** | Vercel | — |

---

## 3. Arquitetura do Projeto

```
ponto-pro/
├── prisma/
│   ├── schema.prisma              # Schema do banco de dados
│   └── migrations/                # Histórico de migrações
├── public/
│   ├── manifest.json              # Configuração PWA
│   ├── icon.png / icon-512.png    # Ícones do PWA
│   └── logo.png                   # Logo do sistema
├── src/
│   ├── app/                       # Rotas (App Router)
│   │   ├── api/                   # API Routes (backend)
│   │   ├── admin/                 # Páginas do Admin
│   │   ├── funcionario/           # Páginas do Funcionário
│   │   ├── saas/                  # Páginas do Super Admin
│   │   ├── landing/               # Landing page
│   │   ├── login/                 # Login
│   │   ├── signup/                # Cadastro
│   │   └── ...                    # Outras páginas
│   ├── components/                # Componentes reutilizáveis
│   │   ├── admin/                 # Componentes admin
│   │   ├── billing/               # Componentes de cobrança
│   │   ├── funcionario/           # Componentes do funcionário
│   │   ├── impersonation/         # Impersonação (Super Admin)
│   │   ├── landing/               # Componentes da landing page
│   │   ├── onboarding/            # Tour guiado
│   │   └── ui/                    # Shadcn/ui primitives
│   ├── config/
│   │   ├── planos.ts              # Definição dos planos
│   │   └── links.ts               # Links externos (WhatsApp, etc.)
│   ├── hooks/
│   │   └── useAdminDashboard.ts   # Hook principal do admin
│   ├── lib/
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── billing.ts             # Lógica de cobrança
│   │   ├── billing-server.ts      # Billing server-side
│   │   ├── asaas.ts               # Integração Asaas
│   │   ├── rekognition.ts         # AWS Rekognition
│   │   ├── email.ts               # Envio de emails (Resend)
│   │   ├── pix.ts                 # Integração PIX
│   │   ├── saas-financeiro.ts     # Relatórios financeiros
│   │   ├── saas-pdf.ts            # Geração de PDFs
│   │   └── admin/
│   │       └── calcularEstatisticas.ts
│   ├── providers/
│   │   ├── SessionProvider.tsx     # NextAuth session
│   │   └── ThemeProvider.tsx       # next-themes wrapper
│   └── types/
│       ├── next-auth.d.ts         # Extensão de tipos NextAuth
│       └── registro.ts            # Tipo RegistroUnificado
├── next.config.ts                 # Configuração Next.js
├── tsconfig.json                  # Configuração TypeScript
├── postcss.config.mjs             # PostCSS (Tailwind v4)
└── package.json                   # Dependências e scripts
```

---

## 4. Banco de Dados (Prisma Schema)

**Provider:** PostgreSQL

### Modelos

#### `Empresa`
Representa uma empresa (tenant) no sistema. Suporta hierarquia matriz/filial.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `nome` | String | Nome da empresa |
| `cnpj` | String? | CNPJ (opcional) |
| `status` | String | `ATIVO` ou `BLOQUEADO` |
| `plano` | String | `STARTER`, `PROFESSIONAL` ou `ENTERPRISE` |
| `billingCycle` | String | `MONTHLY` ou `YEARLY` |
| `billingMethod` | String | `UNDEFINED`, `PIX`, `BOLETO` |
| `matrizId` | String? | FK para empresa matriz (self-relation) |
| `intervaloPago` | Boolean | Se intervalo de almoço é pago |
| `fluxoEstrito` | Boolean | Se fluxo de ponto é sequencial |
| `chavePix` | String? | Chave PIX para recebimento |
| `diaVencimento` | Int | Dia do vencimento da fatura |
| `trialAte` | DateTime? | Data limite do trial |
| `pagoAte` | DateTime? | Assinatura válida até |
| `billingAnchorAt` | DateTime? | Âncora do ciclo de cobrança |
| `cobrancaAtiva` | Boolean | Se cobrança automática está ativa |
| `asaasCustomerId` | String? | ID do cliente no Asaas |
| `asaasSubscriptionId` | String? | ID da assinatura no Asaas |
| `asaasCurrentPaymentId` | String? | ID do pagamento atual no Asaas |
| `asaasCurrentDueDate` | DateTime? | Vencimento atual no Asaas |
| `cobrancaWhatsapp` | String? | WhatsApp para cobranças |
| `configuracoes` | Json? | Configurações operacionais (JSON) |
| `criadoEm` | DateTime | Data de criação |

**Relações:** `usuarios[]`, `filiais[]`, `matriz?`, `feriados[]`, `adminsPermitidos[]`

---

#### `Usuario`
Representa um usuário do sistema (funcionário, admin ou super admin).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `nome` | String | Nome completo |
| `email` | String (unique) | Email de login |
| `senha` | String | Hash bcrypt da senha |
| `cargo` | String | `FUNCIONARIO`, `ADMIN`, `DONO` ou `SUPER_ADMIN` |
| `tituloCargo` | String? | Título do cargo (ex: "Gerente") |
| `fotoPerfilUrl` | String? | URL da foto no Vercel Blob |
| `assinaturaUrl` | String? | URL da assinatura digital |
| `jornada` | Json? | Escala de trabalho semanal |
| `empresaId` | String? | FK para a empresa |
| `latitudeBase` | Float | Latitude do local de trabalho |
| `longitudeBase` | Float | Longitude do local de trabalho |
| `raioPermitido` | Int | Raio permitido em metros (padrão: 100) |
| `pontoLivre` | Boolean | Se pode bater ponto de qualquer local |
| `locaisAdicionais` | Json? | Locais extras autorizados |
| `modoValidacaoPonto` | String | `GPS`, `PC_IP` ou `GPS_E_IP` |
| `ipsPermitidos` | String? | Lista de IPs autorizados |
| `telefone` | String? | Telefone de contato |
| `deveTrocarSenha` | Boolean | Forçar troca de senha no login |
| `deveCadastrarFoto` | Boolean | Forçar cadastro de foto |
| `temaPreferido` | String | `dark`, `light` ou `system` |
| `resetToken` | String? | Token de redefinição de senha |
| `resetTokenExpiry` | DateTime? | Expiração do token |
| `criadoEm` | DateTime | Data de criação |

**Relações:** `empresa?`, `pontos[]`, `ausencias[]`, `solicitacoes[]`, `lojasPermitidas[]`

---

#### `Ponto`
Registro de ponto (entrada, saída, intervalo).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `dataHora` | DateTime | Data e hora do registro |
| `latitude` | Float | Latitude GPS |
| `longitude` | Float | Longitude GPS |
| `endereco` | String? | Endereço geocodificado |
| `fotoUrl` | String? | Foto capturada no momento |
| `tipo` | String | `NORMAL` |
| `subTipo` | String? | `ENTRADA`, `SAIDA_INTERVALO`, `VOLTA_INTERVALO`, `SAIDA` |
| `descricao` | String? | Observações |
| `usuarioId` | String | FK para o usuário |

**Relações:** `usuario` (cascade delete), `solicitacoes[]`

---

#### `Ausencia`
Registro de ausência (férias, atestado, folga, falta).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `dataInicio` | DateTime | Data/hora de início |
| `dataFim` | DateTime | Data/hora de fim |
| `tipo` | String | `FERIAS`, `ATESTADO`, `FOLGA`, `FALTA`, `LICENCA` |
| `motivo` | String | Motivo da ausência |
| `comprovanteUrl` | String? | URL do comprovante anexado |
| `status` | String | `PENDENTE`, `APROVADO`, `REJEITADO` |
| `usuarioId` | String | FK para o usuário |
| `criadoEm` | DateTime | Data de criação |

**Relações:** `usuario` (cascade delete)

---

#### `SolicitacaoAjuste`
Solicitação de ajuste de ponto feita pelo funcionário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `novoHorario` | DateTime | Horário solicitado |
| `motivo` | String | Justificativa |
| `status` | String | `PENDENTE`, `APROVADO`, `REJEITADO` |
| `tipo` | String? | Tipo de ajuste |
| `usuarioId` | String | FK para o usuário |
| `pontoId` | String? | FK para o ponto original |
| `decididoPorId` | String? | ID do admin que decidiu |
| `decididoPorNome` | String? | Nome do admin |
| `decididoEm` | DateTime? | Data da decisão |
| `criadoEm` | DateTime | Data de criação |

**Relações:** `usuario` (cascade delete), `ponto?` (cascade delete)

---

#### `Feriado`
Feriados cadastrados por empresa.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `data` | DateTime | Data do feriado |
| `nome` | String | Nome do feriado |
| `empresaId` | String? | FK para a empresa |

---

#### `AdminLoja`
Vínculo admin ↔ empresa (multi-loja).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `usuarioId` | String | FK para o admin |
| `empresaId` | String | FK para a empresa/loja |

**Constraint:** `@@unique([usuarioId, empresaId])`

---

#### `LogAuditoria`
Logs de auditoria para ações administrativas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `dataHora` | DateTime | Quando ocorreu |
| `acao` | String | Tipo de ação |
| `detalhes` | String | Descrição detalhada |
| `adminNome` | String | Nome do admin |
| `adminId` | String | ID do admin |
| `empresaId` | String | ID da empresa |

---

#### `AsaasWebhookEvent`
Eventos recebidos do webhook Asaas (deduplicação).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `event` | String | Tipo do evento |
| `paymentId` | String | ID do pagamento |
| `payload` | Json | Payload completo |

**Constraint:** `@@unique([event, paymentId])`

---

## 5. Autenticação e Autorização

### Provider
- **NextAuth.js v4** com **Credentials Provider** (email + senha)
- Hash de senha com **bcryptjs**
- Session strategy: **JWT**

### Fluxo de Login
1. Usuário insere email e senha
2. Backend valida credenciais via Prisma
3. Verifica status de billing da empresa (pode bloquear ou alertar)
4. Retorna JWT com: `id`, `cargo`, `empresaId`, `deveTrocarSenha`, `deveCadastrarFoto`, `temAssinatura`
5. Redirecionamentos pós-login:
   - `deveTrocarSenha: true` → `/trocar-senha`
   - `deveCadastrarFoto: true` → `/cadastrar-foto`
   - `cargo === 'ADMIN' || 'DONO'` → `/admin`
   - `cargo === 'FUNCIONARIO'` → `/funcionario`
   - `cargo === 'SUPER_ADMIN'` → `/saas`

### Tipos de Session (next-auth.d.ts)
```typescript
interface Session {
  user: {
    id: string;
    cargo: string;           // FUNCIONARIO | ADMIN | DONO | SUPER_ADMIN
    empresaId: string;
    deveTrocarSenha: boolean;
    deveCadastrarFoto: boolean;
    temAssinatura: boolean;
  }
}
```

### Recuperação de Senha
1. `/esqueci-senha` → envia email com token (válido 24h)
2. `/redefinir-senha?token=xxx` → permite definir nova senha

---

## 6. Páginas e Rotas

### Públicas (sem autenticação)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `landing/page.tsx` | Landing page com features, preços, depoimentos, galeria |
| `/login` | `login/page.tsx` | Login com email/senha |
| `/signup` | `signup/page.tsx` | Cadastro de nova empresa + admin |
| `/redefinir-senha` | `redefinir-senha/page.tsx` | Redefinição de senha via token |
| `/termos` | `termos/page.tsx` | Termos de Uso |
| `/privacidade` | `privacidade/page.tsx` | Política de Privacidade |

### Onboarding (pós-login)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/trocar-senha` | `trocar-senha/page.tsx` | Troca obrigatória de senha (primeiro acesso) |
| `/cadastrar-foto` | `cadastrar-foto/page.tsx` | Cadastro obrigatório de foto de perfil |
| `/cadastrar-assinatura` | `cadastrar-assinatura/page.tsx` | Cadastro de assinatura digital |

### Funcionário

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/funcionario` | `funcionario/page.tsx` | Tela principal — bater ponto (câmera, GPS, botões de fluxo) |
| `/funcionario/historico` | `funcionario/historico/page.tsx` | Histórico de pontos, solicitar ajustes |
| `/funcionario/ausencias` | `funcionario/ausencias/page.tsx` | Solicitar ausências (férias, atestado, folga) |
| `/funcionario/assinatura` | `funcionario/assinatura/page.tsx` | Gerenciar assinatura digital |

### Admin

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin` | `admin/page.tsx` | Painel principal — registros, gráficos, ações rápidas |
| `/admin/dashboard` | `admin/dashboard/page.tsx` | Dashboard em tempo real (quem está trabalhando) |
| `/admin/funcionarios` | `admin/funcionarios/page.tsx` | CRUD de funcionários |
| `/admin/solicitacoes` | `admin/solicitacoes/page.tsx` | Aprovar/rejeitar ajustes de ponto |
| `/admin/pendencias` | `admin/pendencias/page.tsx` | Aprovar/rejeitar ausências (atestados, etc.) |
| `/admin/feriados` | `admin/feriados/page.tsx` | Gerenciar feriados (manual + importar API Brasil) |
| `/admin/configuracoes` | `admin/configuracoes/page.tsx` | Configurações da empresa |
| `/admin/logs` | `admin/logs/page.tsx` | Logs de auditoria |
| `/admin/perfil` | `admin/perfil/page.tsx` | Perfil do admin + informações financeiras |
| `/admin/perfil/plano` | `admin/perfil/plano/page.tsx` | Detalhes do plano atual |
| `/admin/perfil/pagamento` | `admin/perfil/pagamento/page.tsx` | Métodos de pagamento |
| `/admin/perfil/historico` | `admin/perfil/historico/page.tsx` | Histórico de faturas |

### SaaS (Super Admin)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/saas` | `saas/page.tsx` | Dashboard multi-tenant — todas as empresas, stats, ações |
| `/saas/[id]` | `saas/[id]/page.tsx` | Detalhes de uma empresa específica (editar plano, configs, excluir) |
| `/saas/venda` | `saas/venda/page.tsx` | Criar nova empresa manualmente |
| `/super-admin` | `super-admin/page.tsx` | Painel de controle super admin |

### Estado Especial

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/acesso_bloqueado` | `acesso_bloqueado/page.tsx` | Empresa bloqueada por inadimplência |

---

## 7. API Routes (Backend)

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/[...nextauth]` | Login NextAuth (Credentials) |
| POST | `/api/auth/trocar-senha` | Trocar senha do usuário autenticado |
| POST | `/api/auth/redefinir-senha` | Redefinir senha via token |
| POST | `/api/auth/esqueci-senha` | Solicitar email de recuperação |
| POST | `/api/auth/cadastrar-foto` | Upload de foto de perfil |
| GET/PUT | `/api/user/tema` | Obter/salvar preferência de tema |

### Ponto (Registro)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/bater-ponto` | Registrar ponto (GPS + foto + validação) |
| POST | `/api/funcionario/ponto` | Registrar ponto (detalhado, multi-modo) |
| GET | `/api/funcionario/ponto/status` | Status atual (trabalhando/pausa/offline) |
| DELETE | `/api/funcionario/ponto/excluir` | Funcionário exclui próprio registro |
| PUT | `/api/admin/ponto/editar` | Admin edita horário de ponto |
| DELETE | `/api/admin/ponto/excluir` | Admin exclui registro de ponto |
| GET | `/api/admin/pontos-todos` | Listar todos os pontos da empresa |

### Ausências

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/funcionario/solicitar-ausencia` | Listar/criar ausências do funcionário |
| GET/POST | `/api/admin/ausencias` | Listar pendentes / Aprovar/rejeitar |
| DELETE | `/api/admin/ausencias/excluir` | Excluir ausência |
| POST | `/api/admin/ausencias/criar` | Admin cria ausência diretamente (auto-aprovada) |
| GET | `/api/admin/ausencias-aprovadas` | Listar ausências aprovadas |

### Solicitações de Ajuste

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/funcionario/solicitar-ajuste` | Solicitar ajuste de ponto |
| GET | `/api/funcionario/minhas-solicitacoes` | Listar minhas solicitações |
| GET/POST | `/api/admin/solicitacoes` | Listar/decidir solicitações |

### Funcionários

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/admin/funcionarios` | Listar/criar funcionários |
| POST | `/api/admin/funcionarios/resetar-senha` | Resetar senha para "1234" |
| PUT | `/api/admin/usuario/jornada` | Atualizar jornada de trabalho |

### Empresa / Configuração

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/PUT | `/api/admin/empresa` | Dados e configurações da empresa |
| POST | `/api/admin/nova-loja` | Criar filial |
| DELETE | `/api/admin/excluir-loja` | Excluir filial |
| GET | `/api/admin/trocar-loja` | Listar lojas acessíveis |
| GET | `/api/funcionario/config` | Configurações para o funcionário |

### Dashboard / Histórico

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/admin/dashboard/agora` | Status em tempo real de todos |
| GET | `/api/funcionario/historico` | Histórico unificado (pontos + ausências) |
| GET | `/api/admin/logs` | Logs de auditoria (com filtros) |

### Feriados

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/admin/feriados` | Listar/criar feriados |
| POST | `/api/admin/feriados/importar` | Importar feriados nacionais (API Brasil) |

### Billing / Pagamento

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/admin/pagamento` | Info/gestão de pagamento |
| GET | `/api/admin/plano` | Detalhes do plano atual |
| GET | `/api/admin/faturas` | Listar faturas |
| GET | `/api/admin/faturas/historico` | Histórico de faturas |
| GET | `/api/admin/asaas/cobranca-atual` | Dados da cobrança Asaas atual |
| POST | `/api/admin/asaas/gerar-cobranca` | Gerar nova cobrança no Asaas |
| GET | `/api/empresa/billing-status` | Status de billing (seguro para funcionários) |

### SaaS (Super Admin)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/saas/gestao` | Listar todas as empresas |
| GET | `/api/saas/dashboard` | Estatísticas globais |
| POST | `/api/saas/criar-empresa` | Criar empresa com trial |
| GET/PUT | `/api/saas/empresa/[id]` | Detalhes/editar empresa |
| POST | `/api/saas/usuarios` | Listar usuários de uma empresa |
| POST | `/api/saas/novo-admin` | Criar admin em empresa |
| PUT | `/api/saas/toggle-bloqueio` | Bloquear/desbloquear empresa |
| DELETE | `/api/saas/excluir-empresa` | Excluir empresa e dados |
| DELETE | `/api/saas/excluir-usuario` | Excluir usuário |
| PUT | `/api/saas/atualizar-financeiro` | Editar dados financeiros |
| POST | `/api/saas/confirmar-pagamento` | Confirmar pagamento manual |
| POST | `/api/saas/resetar-senha` | Resetar senha de qualquer usuário |
| GET/POST | `/api/saas/fatura-asaas` | Fatura Asaas por empresa |

### Impersonação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/admin/impersonate` | Super Admin entra como outro usuário |
| POST | `/api/admin/impersonate/stop` | Volta à sessão original |

### Webhooks

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/webhooks/asaas` | Webhook Asaas (pagamentos) |
| POST | `/api/billing/asaas/webhook` | Webhook billing Asaas |

### Utilitários

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/utils/ip` | Retorna IP do cliente |
| GET | `/api/debug-session` | Debug da sessão (dev) |
| POST | `/api/public/signup` | Cadastro público de empresa |

---

## 8. Componentes

### Core

| Componente | Descrição |
|-----------|-----------|
| `ThemeToggle` | Botão de tema 3 estados (dark → light → system) com persistência no DB |
| `ThemeSyncer` | Carrega tema do banco ao fazer login |
| `ThemedToaster` | Sonner Toaster que acompanha o tema ativo |
| `InstallPrompt` | Prompt de instalação PWA |
| `PwaLoginGate` | Gate de autenticação PWA |

### Admin

| Componente | Descrição |
|-----------|-----------|
| `AdminRegistrosTable` | Tabela de registros com foto, edição inline, exclusão |
| `ActionCard` | Card de ação rápida (funcionários, ajustes, etc.) |
| `BillingAlertModal` | Modal de alerta financeiro (trial, vencimento, bloqueio) |
| `FinanceAlertBanner` | Banner de alerta financeiro no topo |

### Funcionário

| Componente | Descrição |
|-----------|-----------|
| `BottomNav` | Navegação inferior mobile (Ponto, Histórico, Ausências) |
| `NotificacaoSolicitacao` | Notificação push-like quando solicitação é decidida |

### Modais

| Componente | Descrição |
|-----------|-----------|
| `ModalFuncionario` | Criar/editar funcionário (com mapa, jornada, validação) |
| `ModalLancarAusencia` | Lançar ausência (com horários parciais, comprovante) |
| `ModalEditarJornada` | Editar escala de trabalho semanal |
| `PaymentModal` | Modal de pagamento (PIX, boleto) |

### Dashboard

| Componente | Descrição |
|-----------|-----------|
| `DashboardGraficos` | Gráficos Recharts (horas trabalhadas, distribuição) |
| `BotaoRelatorio` | Botão para gerar relatório PDF/Excel com filtros |
| `SeletorLoja` | Dropdown para trocar entre lojas/filiais |
| `MapaCaptura` | Mapa Leaflet para definir localização do funcionário |

### Landing Page

| Componente | Descrição |
|-----------|-----------|
| `desktop-menu` / `mobile-menu` | Navegação da landing |
| `pricing-section` | Tabela de preços dos planos |
| `gallery-carousel` / `mobile-carousel` | Galeria de screenshots |
| `about-modal` / `demo-modal` / `contact-modal` | Modais informativos |

### Onboarding

| Componente | Descrição |
|-----------|-----------|
| `OnboardingMount` | Monta o tour guiado (Driver.js) |
| `AdminTour` | Tour interativo para novos admins |
| `FuncionarioTour` | Tour interativo para novos funcionários |

### Impersonação

| Componente | Descrição |
|-----------|-----------|
| `ImpersonationRoot` | Wrapper de contexto de impersonação |
| `ImpersonationBanner` | Banner fixo "Você está como [Fulano]" |

### UI Primitives (Shadcn/ui)

`Button`, `Card`, `Input`, `Label`, `Badge`, `Dialog`, `Sheet`

---

## 9. Hooks, Providers e Utilitários

### Hooks

#### `useAdminDashboard`
Hook principal do painel admin. Gerencia:
- **Estado:** registros, usuários, feriados, billing
- **Filtros:** período, busca, tipo de registro
- **Ações:** editar ponto, excluir ponto/ausência, lançar ausência, editar jornada
- **Cálculos:** estatísticas (horas trabalhadas, extras, atrasos)
- **Notificações:** som de alerta via Web Audio API quando novo registro chega
- **Polling:** atualização periódica dos dados

### Providers

| Provider | Descrição |
|----------|-----------|
| `SessionProvider` | Wrapper NextAuth para disponibilizar `useSession()` |
| `ThemeProvider` | Wrapper next-themes com `attribute="class"`, `defaultTheme="dark"`, `enableSystem` |

### Hierarquia no layout.tsx
```
<html suppressHydrationWarning>
  <body>
    <ThemeProvider>           ← Tema (fora da sessão)
      <Provider>              ← NextAuth session
        <ThemeSyncer />       ← Carrega tema do DB (dentro da sessão)
        <OnboardingMount />   ← Tour guiado
        {children}            ← Páginas
        <ThemedToaster />     ← Toasts
        <ImpersonationRoot /> ← Banner de impersonação
      </Provider>
    </ThemeProvider>
  </body>
</html>
```

### Utilitários (`src/lib/`)

| Arquivo | Descrição |
|---------|-----------|
| `db.ts` | Singleton do Prisma Client |
| `billing.ts` | Cálculo de status de billing (trial, vencido, bloqueado) |
| `billing-server.ts` | Lógica server-side de billing |
| `asaas.ts` | SDK wrapper para API Asaas (criar cliente, cobrança, consultar) |
| `rekognition.ts` | Integração AWS Rekognition (comparar rostos) |
| `email.ts` | Envio de emails via Resend (boas-vindas, reset, convite) |
| `pix.ts` | Geração de QR code PIX |
| `saas-pdf.ts` | Geração de relatórios PDF para o SaaS |
| `saas-financeiro.ts` | Relatórios financeiros |
| `admin/calcularEstatisticas.ts` | Cálculo de horas trabalhadas, extras, atrasos, banco de horas |
| `utils.ts` | Função `cn()` para merge de classes Tailwind |
| `logger.ts` | Utilitário de logging |
| `base64url.ts` | Codificação/decodificação Base64URL |

### Config (`src/config/`)

| Arquivo | Descrição |
|---------|-----------|
| `planos.ts` | Definição dos 3 planos, preços, limites, features |
| `links.ts` | Links externos (WhatsApp, Instagram, email, vídeo demo) |

### Types (`src/types/`)

| Arquivo | Descrição |
|---------|-----------|
| `next-auth.d.ts` | Extensão dos tipos Session/User/JWT do NextAuth |
| `registro.ts` | Interface `RegistroUnificado` (ponto + ausência unificados) |

---

## 10. Sistema de Billing (Cobrança)

### Ciclo de Vida

```
CADASTRO → TRIAL (14 dias) → COBRANÇA ATIVA → [PAGO / VENCIDO / BLOQUEADO]
```

### Status de Billing (`BillingCode`)

| Código | Descrição | Acesso |
|--------|-----------|--------|
| `OK` | Assinatura em dia | ✅ Liberado |
| `TRIAL_ACTIVE` | Dentro do período de trial | ✅ Liberado |
| `TRIAL_ENDING` | Trial termina em 1 dia | ✅ Liberado + alerta |
| `TRIAL_EXPIRED` | Trial expirou | ❌ Bloqueado |
| `DUE_SOON` | Vencimento em 1 dia | ✅ Liberado + alerta |
| `PAST_DUE` | Vencido (1-10 dias de tolerância) | ✅ Liberado + alerta |
| `BLOCKED` | Vencido há mais de 10 dias | ❌ Bloqueado |
| `MANUAL_BLOCK` | Bloqueado manualmente pelo Super Admin | ❌ Bloqueado |
| `PENDING_FIRST_INVOICE` | Trial acabou, aguardando 1ª fatura | ✅ Liberado + alerta |

### Tolerância
- **10 dias** de carência após o vencimento
- Dia 1-10: acesso permitido com alertas crescentes
- Dia 11+: acesso bloqueado → redireciona para `/acesso_bloqueado`

### Integração Asaas
- Criação automática de clientes e cobranças
- Webhook para confirmar pagamentos (`PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`)
- Webhook para marcar inadimplência (`PAYMENT_OVERDUE`)
- Suporte a PIX e boleto

---

## 11. Planos e Precificação

### Tabela de Planos

| | STARTER | PROFESSIONAL | ENTERPRISE |
|--|---------|--------------|-----------|
| **Preço Mensal** | R$ 69,90 | R$ 99,90 | R$ 199,90 |
| **Desconto Anual** | 10% | 10% | 10% |
| **Preço Anual/mês** | R$ 62,91 | R$ 89,91 | R$ 179,91 |
| **Funcionários inclusos** | 10 | 20 | 80 |
| **Admins inclusos** | 1 | 2 | 5 |
| **Filiais inclusas** | 0 (sede) | 2 | Ilimitado |
| **Func. extra** | R$ 7,90/mês | R$ 6,90/mês | R$ 4,90/mês |
| **Admin extra** | R$ 49,90/mês | R$ 39,90/mês | R$ 29,90/mês |
| **Filial extra** | R$ 49,90/mês | R$ 39,90/mês | Grátis |
| **Reconhecimento Facial** | ❌ | ✅ | ✅ |
| **Relatórios PDF** | Básico | Completo | Completo |
| **Suporte** | Email | WhatsApp + Email | Prioritário |

### Cálculo da Fatura
```
valor = precoBase
      + max(0, totalFuncionarios - maxFuncionarios) × extraFuncionario
      + max(0, totalAdmins - maxAdmins) × extraAdmin
      + max(0, totalFiliais - maxFiliais) × extraFilial

Se billingCycle === "YEARLY":
  valor = valor × 12 × (1 - 0.10)  // desconto 10%
```

---

## 12. Sistema de Temas (Dark/Light)

### Implementação
- **CSS Custom Properties** em `globals.css` com tokens semânticos
- `:root` define valores do tema escuro (padrão)
- `.light` sobrescreve com valores claros
- **Tailwind v4** registra tokens via `@theme inline`
- **next-themes** alterna a classe `dark`/`light` no `<html>`

### Tokens Principais

| Token Tailwind | Escuro | Claro |
|---------------|--------|-------|
| `bg-page` | #0f172a | #f8fafc |
| `bg-surface` | slate-900/50 | white/70 |
| `bg-surface-solid` | #0f172a | #ffffff |
| `bg-elevated` | slate-800/50 | slate-100/70 |
| `bg-elevated-solid` | #1e293b | #f1f5f9 |
| `text-text-primary` | #ffffff | #0f172a |
| `text-text-secondary` | #f1f5f9 | #1e293b |
| `text-text-muted` | #94a3b8 | #64748b |
| `border-border-subtle` | white/5 | black/5 |
| `border-border-default` | white/10 | black/8 |

### Persistência
1. `ThemeToggle` alterna entre dark → light → system
2. Salva no banco via `PUT /api/user/tema`
3. `ThemeSyncer` restaura ao fazer login
4. `next-themes` persiste no `localStorage` entre reloads

### Transição Suave
- Todas as propriedades (background, border, color) com `transition: 0.2s ease`
- Exclui animações (`animate-spin`, `animate-pulse`)

---

## 13. PWA (Progressive Web App)

### Configuração
```json
{
  "name": "WorkID App",
  "short_name": "WorkID",
  "display": "standalone",
  "start_url": "/",
  "orientation": "portrait",
  "theme_color": "#111827",
  "background_color": "#111827"
}
```

### Recursos
- Instalável no celular (Android/iOS)
- Interface standalone (sem barra do navegador)
- Ícones em 192x192 e 512x512
- Orientação retrato
- `InstallPrompt` componente para sugerir instalação

---

## 14. Integrações Externas

### AWS Rekognition
- **Uso:** Reconhecimento facial no registro de ponto
- **Fluxo:** Foto capturada → base64 → comparada com foto de perfil via `CompareFaces`
- **Requisito:** Plano PROFESSIONAL ou ENTERPRISE

### Asaas (Gateway de Pagamento)
- **Uso:** Cobrança automática (PIX, boleto)
- **Fluxo:** Criar cliente → Criar cobrança → Webhook confirma pagamento
- **Ambiente:** Sandbox (dev) / Produção (prod)
- **Eventos processados:** `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`

### Vercel Blob
- **Uso:** Armazenamento de fotos de perfil, comprovantes de ausência, assinaturas
- **Operação:** Upload via `@vercel/blob` → retorna URL pública

### Resend
- **Uso:** Envio de emails transacionais
- **Templates:** Boas-vindas, recuperação de senha, convite de admin

### API Brasil (brasilapi.com.br)
- **Uso:** Importação de feriados nacionais por ano

### Leaflet
- **Uso:** Mapas interativos para definir localização dos funcionários
- **Fluxo:** Admin busca endereço → geocode → define latitude/longitude/raio

---

## 15. Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `NEXTAUTH_SECRET` | Secret para JWT do NextAuth |
| `NEXTAUTH_URL` | URL base da aplicação |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob Storage |
| `AWS_ACCESS_KEY_ID` | Credencial AWS (Rekognition) |
| `AWS_SECRET_ACCESS_KEY` | Secret AWS |
| `AWS_REGION` | Região AWS (us-east-1) |
| `RESEND_API_KEY` | API key do Resend (email) |
| `ASAAS_ENV` | Ambiente Asaas (`sandbox` ou `production`) |
| `ASAAS_BASE_URL` | URL base da API Asaas |
| `ASAAS_API_KEY` | API key Asaas |
| `ASAAS_WEBHOOK_TOKEN` | Token para validar webhooks Asaas |
| `ASAAS_WEBHOOK_ALLOW_ANON` | Permitir webhooks sem token (dev) |
| `SUPER_RESET_TOKEN` | Token para resetar super admin |
| `SUPER_RESET_PASSWORD` | Senha padrão do super admin |
| `SAAS_MASTER_KEY` | Chave mestra SaaS |

---

## 16. Fluxos Principais

### Fluxo de Registro de Ponto (Funcionário)

```
1. Funcionário abre /funcionario
2. Sistema verifica GPS (ou IP, conforme modo)
3. Câmera ativa → captura foto
4. Se plano permite: compara face (Rekognition)
5. Verifica sequência (fluxo estrito):
   ENTRADA → SAÍDA_INTERVALO → VOLTA_INTERVALO → SAÍDA
6. Registra ponto com lat/long/foto/hora
7. Admin recebe notificação sonora no dashboard
```

### Fluxo de Solicitação de Ajuste

```
1. Funcionário vai em /funcionario/historico
2. Clica em "Solicitar Ajuste" em um registro
3. Preenche novo horário + motivo
4. Admin vê solicitação em /admin/solicitacoes
5. Aprova (horário é alterado) ou Rejeita
6. Funcionário recebe notificação com resultado
```

### Fluxo de Ausência

```
1. Funcionário vai em /funcionario/ausencias
2. Seleciona tipo (férias, atestado, folga, falta)
3. Define período + motivo + comprovante (opcional)
4. Admin vê em /admin/pendencias
5. Aprova ou rejeita
```

### Fluxo de Onboarding (Nova Empresa)

```
1. Empresa se cadastra em /signup
2. Sistema cria: Empresa + Usuário (DONO) + Trial 14 dias
3. Primeiro login → trocar senha
4. Segundo passo → cadastrar foto
5. Tour guiado (Driver.js) explica o sistema
6. Admin cadastra funcionários
7. Funcionários recebem credenciais → trocar senha → cadastrar foto
```

### Fluxo de Cobrança

```
1. Trial de 14 dias → empresa usa livremente
2. Trial expira → gera 1ª cobrança (Asaas)
3. Notificação 1 dia antes do vencimento
4. Se não pagar: 10 dias de tolerância com alertas
5. Dia 11+: acesso bloqueado → /acesso_bloqueado
6. Pagamento confirmado (webhook) → acesso restaurado
```

---

## 17. Papéis e Permissões

### Hierarquia

```
SUPER_ADMIN
  └── DONO / ADMIN
        └── FUNCIONARIO
```

### Permissões por Papel

| Recurso | FUNCIONARIO | ADMIN / DONO | SUPER_ADMIN |
|---------|:-----------:|:------------:|:-----------:|
| Bater ponto | ✅ | ❌ | ❌ |
| Ver próprio histórico | ✅ | ✅ | ✅ |
| Solicitar ajuste | ✅ | ❌ | ❌ |
| Solicitar ausência | ✅ | ❌ | ❌ |
| Ver dashboard | ❌ | ✅ | ✅ |
| Gerenciar funcionários | ❌ | ✅ | ✅ |
| Aprovar solicitações | ❌ | ✅ | ✅ |
| Aprovar ausências | ❌ | ✅ | ✅ |
| Gerenciar feriados | ❌ | ✅ | ✅ |
| Ver logs de auditoria | ❌ | ✅ | ✅ |
| Configurar empresa | ❌ | ✅ | ✅ |
| Criar/excluir filiais | ❌ | ✅ | ✅ |
| Gerar relatórios | ❌ | ✅ | ✅ |
| Ver todas as empresas | ❌ | ❌ | ✅ |
| Criar empresas | ❌ | ❌ | ✅ |
| Bloquear empresas | ❌ | ❌ | ✅ |
| Impersonar usuários | ❌ | ❌ | ✅ |
| Confirmar pagamentos | ❌ | ❌ | ✅ |
| Excluir empresas | ❌ | ❌ | ✅ |

---

## Scripts Disponíveis

```bash
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção (gera Prisma + Next.js)
npm run start      # Iniciar servidor de produção
npm run lint       # Executar ESLint
```

---

## Deploy

- **Plataforma:** Vercel
- **Banco:** PostgreSQL (Neon / Supabase / Railway)
- **Storage:** Vercel Blob
- **Domínio:** Configurado na Vercel

### Checklist de Deploy
1. Configurar variáveis de ambiente na Vercel
2. Executar `npx prisma migrate deploy` no banco de produção
3. Configurar webhooks do Asaas apontando para `/api/webhooks/asaas`
4. Configurar domínio e SSL
5. Alterar `ASAAS_ENV` para `production`

---

*Documentação gerada automaticamente em 04/03/2026.*
