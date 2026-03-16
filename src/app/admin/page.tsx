'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  LogOut,
  Bell,
  AlertCircle,
  ShieldAlert,
  CalendarDays,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  Save,
  X,
  Plane,
  PlusCircle,
  ScrollText,
  LayoutDashboard,
  Search,
  Lock,
  AlertTriangle,
  Edit2,
} from 'lucide-react';

import BotaoRelatorio from '@/components/BotaoRelatorio';
import DashboardGraficos from '@/components/DashboardGraficos';
import SeletorLoja from '@/components/SeletorLoja';
import ModalEditarJornada from '@/components/ModalEditarJornada';
import ModalLancarAusencia from '@/components/ModalLancarAusencia';

import AdminRegistrosTable from '@/components/admin/AdminRegistrosTable';
import { useAdminDashboard, criarDataLocal } from '@/hooks/useAdminDashboard';
import BillingAlertModal from '@/components/admin/BillingAlertModal';
import CienciaCelularAlertModal from '@/components/admin/CienciaCelularAlertModal';
import ActionCard from '@/components/admin/ActionCard';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import { ADMIN_TOUR_RESTART_EVENT } from '@/components/onboarding/AdminTour';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminDashboard() {
  const a = useAdminDashboard();

  if (a.loading)
    return (
      <div className="min-h-screen bg-page flex items-center justify-center text-text-muted gap-3">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        Carregando painel...
      </div>
    );

  return (
    <div className="min-h-screen bg-page text-text-secondary font-sans selection:bg-purple-500/30 relative overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Efeitos de Fundo */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <BillingAlertModal empresa={a.billingEmpresa || a.empresa} billing={a.billing} />
      <CienciaCelularAlertModal />

      {/* Toast de Pendências */}
      {a.notificacaoVisivel && (
        <div
          className={`fixed top-4 right-4 z-[100] animate-in slide-in-from-right-full duration-300 fade-in w-80 ${
            a.billingEmpresa ? 'mt-16' : ''
          }`}
        >
          <div className="bg-surface-solid/90 backdrop-blur-xl border border-border-default rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
            {/* Barra de progresso animada no topo */}
            <div className="h-0.5 bg-elevated-solid overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-[shrink_8s_linear_forwards]" />
            </div>

            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Ícone discreto */}
                <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 shrink-0 mt-0.5">
                  <Bell size={16} className="text-purple-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">Pendências</p>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {a.pendenciasAjuste > 0 && (
                      <Link
                        data-tour="admin-ajustes"
                        href="/admin/solicitacoes"
                        className="flex items-center gap-2 text-xs text-text-muted hover:text-purple-300 transition-colors group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                        <span>{a.pendenciasAjuste} solicitação(ões) de ajuste</span>
                        <span className="ml-auto text-[10px] text-text-dim group-hover:text-purple-400">ver →</span>
                      </Link>
                    )}
                    {a.pendenciasAusencia > 0 && (
                      <Link
                        href="/admin/pendencias"
                        className="flex items-center gap-2 text-xs text-text-muted hover:text-purple-300 transition-colors group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{a.pendenciasAusencia} justificativa(s) pendente(s)</span>
                        <span className="ml-auto text-[10px] text-text-dim group-hover:text-purple-400">ver →</span>
                      </Link>
                    )}
                    {a.pendenciasHoraExtra > 0 && (
                      <Link
                        href="/admin/solicitacoes"
                        className="flex items-center gap-2 text-xs text-text-muted hover:text-purple-300 transition-colors group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                        <span>{a.pendenciasHoraExtra} hora(s) extra(s) pendente(s)</span>
                        <span className="ml-auto text-[10px] text-text-dim group-hover:text-purple-400">ver →</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Botão fechar */}
                <button
                  onClick={() => a.setNotificacaoVisivel(false)}
                  className="p-1 text-text-dim hover:text-text-secondary rounded-lg hover:bg-hover-bg transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto p-4 md:p-8 pb-8 relative z-10 space-y-8 ${a.billingEmpresa ? 'mt-10' : ''}`}>
        {/* === CABEÇALHO === */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
                <LayoutDashboard size={20} className="text-purple-400" />
              </div>
              <div>
                <h1 data-tour="admin-title" className="text-3xl font-bold text-text-primary tracking-tight">
                  {a.empresa.nome}
                </h1>
                <p className="text-text-muted text-xs font-medium uppercase tracking-widest">Painel Administrativo</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center gap-3 w-full xl:w-auto">
            <div data-tour="admin-store-selector" className="w-full xl:w-auto xl:flex-1">
              <SeletorLoja empresaAtualId={a.empresa.id} empresaAtualNome={a.empresa.nome} />
            </div>

            <div className="flex items-center gap-2 justify-between xl:justify-end">
              <button
                onClick={() => window.dispatchEvent(new Event(ADMIN_TOUR_RESTART_EVENT))}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 transition-all text-xs font-bold"
              >
                <HelpCircle size={14} />
                <span className="hidden sm:inline">Tutorial</span>
              </button>

              <div className="flex items-center gap-1 bg-surface backdrop-blur border border-border-subtle p-1.5 rounded-xl">
                <Link
                  data-tour="admin-profile"
                  href="/admin/perfil"
                  className="p-2.5 hover:bg-hover-bg-strong rounded-lg text-text-muted hover:text-text-primary transition-colors"
                  title="Minha Conta"
                >
                  <User size={18} />
                </Link>
                <ThemeToggle />
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="p-2.5 hover:bg-red-500/20 text-text-muted hover:text-red-400 rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <PushNotificationPrompt />

        {/* === AÇÕES RÁPIDAS === */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 grid-flow-dense">
            <ActionCard
              dataTour="admin-ausencia"
              onClick={a.abrirModalAusencia}
              icon={<Plane size={20} className="text-text-secondary group-hover:text-text-primary" />}
              label="Lançar Ausência"
              className="shadow-lg shadow-black/20"
            />

            <ActionCard
              dataTour="admin-ajustes"
              href="/admin/solicitacoes"
              icon={<AlertCircle size={20} className="text-purple-400" />}
              label="Ajustes"
              accent="purple"
              badge={a.pendenciasAjuste + a.pendenciasHoraExtra}
            />

            {!a.configs.ocultar_menu_atestados && (
              <ActionCard
                dataTour="admin-atestados"
                href="/admin/pendencias"
                icon={<ShieldAlert size={20} className="text-yellow-400" />}
                label="Atestados"
                accent="yellow"
                badge={a.pendenciasAusencia}
              />
            )}

            <ActionCard
              dataTour="admin-team"
              href="/admin/funcionarios"
              icon={<User size={20} className="text-purple-400 group-hover:text-purple-300" />}
              label="Gestão da Equipe"
              accent="purple"
              className="col-span-2 md:col-span-1 order-first md:order-none p-5 md:p-4 ring-1 ring-purple-500/15 shadow-lg shadow-black/20"
            />

            <ActionCard
              dataTour="admin-visao-geral"
              href="/admin/dashboard"
              icon={<LayoutDashboard size={20} className="text-text-muted group-hover:text-text-primary" />}
              label="Visão Geral"
            />

            <ActionCard
              dataTour="admin-auditoria"
              href="/admin/logs"
              icon={<ScrollText size={20} className="text-text-muted group-hover:text-text-primary" />}
              label="Auditoria"
            />

            <ActionCard
              dataTour="admin-feriados"
              href="/admin/feriados"
              icon={<CalendarDays size={20} className="text-text-muted group-hover:text-text-primary" />}
              label="Feriados"
            />

          </div>
        </div>

        {/* === FILTROS === */}
        <div className="relative z-20 bg-surface/60 backdrop-blur-xl border border-border-subtle p-5 rounded-3xl shadow-xl flex flex-col lg:flex-row gap-6 items-end">
          <div className="w-full lg:flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-text-faint tracking-wider ml-1">Funcionário</label>

              <div className="flex gap-2">
                <div ref={a.dropdownRef} className="relative flex-1 group">
                  <Search
                    size={16}
                    className="absolute left-3 top-3.5 text-text-faint group-hover:text-purple-400 transition-colors pointer-events-none"
                  />

                  <button
                    data-tour="admin-filter-user"
                    type="button"
                    onClick={() => a.setDropdownAberto((v) => !v)}
                    className="w-full bg-input-solid/50 border border-border-default hover:border-purple-500/50 rounded-xl py-3 pl-10 pr-10 text-sm text-text-secondary outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-left cursor-pointer"
                    title="Selecionar funcionário"
                  >
                    <span className="block truncate">
                      {a.usuarioSelecionado ? a.usuarioSelecionado.nome : 'Todos os Funcionários'}
                    </span>
                  </button>

                  {a.filtroUsuario && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        a.setFiltroUsuario('');
                        a.setBuscaFuncionario('');
                        a.setDropdownAberto(false);
                      }}
                      className="absolute right-3 top-3.5 text-text-faint hover:text-text-secondary transition-colors"
                      title="Limpar filtro"
                    >
                      <X size={16} />
                    </button>
                  )}

                  {a.dropdownAberto && (
                    <div className="absolute z-[60] mt-2 w-full bg-page border border-border-default rounded-2xl shadow-2xl overflow-hidden">
                      <div className="p-2 border-b border-border-subtle">
                        <input
                          autoFocus
                          value={a.buscaFuncionario}
                          onChange={(e) => a.setBuscaFuncionario(e.target.value)}
                          placeholder="Digite o nome ou email..."
                          className="w-full bg-surface/60 border border-border-default rounded-xl px-3 py-2 text-sm text-text-secondary outline-none focus:border-purple-500/60"
                        />
                      </div>

                      <div className="max-h-64 overflow-auto">
                        <button
                          type="button"
                          onClick={() => {
                            a.setFiltroUsuario('');
                            a.setBuscaFuncionario('');
                            a.setDropdownAberto(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-hover-bg transition-colors ${
                            !a.filtroUsuario ? 'text-purple-300' : 'text-text-secondary'
                          }`}
                        >
                          Todos os Funcionários
                        </button>

                        {a.usuariosFiltrados.length > 0 ? (
                          a.usuariosFiltrados.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                a.setFiltroUsuario(u.id);
                                a.setBuscaFuncionario('');
                                a.setDropdownAberto(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-hover-bg transition-colors ${
                                a.filtroUsuario === u.id ? 'text-purple-300' : 'text-text-secondary'
                              }`}
                              title={u.email || u.nome}
                            >
                              <div className="flex flex-col">
                                <span className="font-semibold truncate">{u.nome}</span>
                                {u.email && <span className="text-[10px] text-text-faint truncate">{u.email}</span>}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-xs text-text-faint">Nenhum funcionário encontrado.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {a.filtroUsuario && (
                  <button
                    onClick={() => a.setModalJornadaAberto(true)}
                    className="px-3 bg-elevated-solid hover:bg-purple-600 text-text-muted hover:text-white rounded-xl border border-border-default transition-colors"
                    title="Configurar Escala"
                  >
                    <Clock size={20} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-text-faint tracking-wider ml-1">Período</label>
              <div data-tour="admin-filter-period" className="flex gap-2 items-center bg-input-solid/50 border border-border-default rounded-xl p-1">
                <input
                  type="date"
                  value={a.dataInicio}
                  onChange={(e) => a.setDataInicio(e.target.value)}
                  className="bg-transparent text-sm text-text-secondary outline-none p-2 w-full text-center cursor-pointer hover:text-text-primary transition-colors"
                />
                <span className="text-text-dim text-xs">até</span>
                <input
                  type="date"
                  value={a.dataFim}
                  onChange={(e) => a.setDataFim(e.target.value)}
                  className="bg-transparent text-sm text-text-secondary outline-none p-2 w-full text-center cursor-pointer hover:text-text-primary transition-colors"
                />
              </div>
            </div>
          </div>

          <div data-tour="admin-report">
            <BotaoRelatorio
              pontos={a.registrosFiltrados}
              filtro={{
                inicio: criarDataLocal(a.dataInicio),
                fim: criarDataLocal(a.dataFim),
                usuario: a.filtroUsuario ? a.usuarios.find((u) => u.id === a.filtroUsuario)?.nome : 'Todos',
              }}
              resumoHoras={a.stats}
              assinaturaUrl={
                a.filtroUsuario ? (a.usuarios.find((u) => u.id === a.filtroUsuario) as any)?.assinaturaUrl : null
              }
              nomeEmpresa={a.empresa.nome}
              dadosEmpresaCompleto={a.empresa}
            />
          </div>
        </div>

        {/* === CARDS === */}
        {a.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              className={`p-5 rounded-2xl border backdrop-blur-md shadow-lg transition-all ${
                a.stats.status.includes('Trabalhando') || a.stats.status.includes('Pausa Café (Pago)')
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-surface border-border-subtle'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Status Atual</h3>
                <span
                  className={`w-2 h-2 rounded-full ${
                    a.stats.status.includes('Trabalhando') || a.stats.status.includes('Pausa Café (Pago)')
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-600'
                  }`}
                />
              </div>
              <p
                className={`text-xl font-bold ${
                  a.stats.status.includes('Trabalhando') || a.stats.status.includes('Pausa Café (Pago)')
                    ? 'text-emerald-400'
                    : 'text-text-faint'
                }`}
              >
                {a.stats.status}
              </p>
              {a.stats.status !== 'Ausente' && (
                <p className="text-xs text-emerald-400/60 mt-1 font-mono">Tempo: {a.stats.tempoAgora}</p>
              )}
            </div>

            <div className="bg-surface backdrop-blur-md p-5 rounded-2xl border border-border-subtle shadow-lg">
              <h3 className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-2">Hoje</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-text-primary">{a.stats.hoje}</p>
                <p className="text-[10px] text-text-faint">/ Meta: {a.stats.metaHoje}</p>
              </div>
            </div>

            <div className="bg-surface backdrop-blur-md p-5 rounded-2xl border border-border-subtle shadow-lg">
              <h3 className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-2">Total Período</h3>
              <p className="text-2xl font-bold text-text-primary">{a.stats.total}</p>
            </div>

            {!a.configs.ocultarSaldoHoras ? (
              <div
                className={`p-5 rounded-2xl border backdrop-blur-md shadow-lg ${
                  a.stats.saldoPositivo ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'
                }`}
              >
                <h3 className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 mb-2">
                  {a.stats.saldoPositivo ? (
                    <TrendingUp size={14} className="text-emerald-500" />
                  ) : (
                    <TrendingDown size={14} className="text-rose-500" />
                  )}
                  <span className={a.stats.saldoPositivo ? 'text-emerald-500' : 'text-rose-500'}>Banco</span>
                </h3>
                <p className={`text-3xl font-bold ${a.stats.saldoPositivo ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {a.stats.saldo}
                </p>
              </div>
            ) : (
              <div className="bg-surface p-5 rounded-2xl border border-border-subtle flex items-center justify-center opacity-50">
                <p className="text-xs text-text-faint">Saldo Oculto</p>
              </div>
            )}
          </div>
        )}

        {/* === TABELA (SEPARADA) === */}
        <AdminRegistrosTable
          registrosFiltrados={a.registrosFiltrados}
          abrirModalEdicao={a.abrirModalEdicao}
          excluirPonto={a.excluirPonto}
          excluirAusencia={a.excluirAusencia}
        />

        <div className="mt-8">
          <DashboardGraficos registros={a.registrosFiltrados} />
        </div>

        {/* === MODAL EDITAR PONTO (mantido aqui por segurança) === */}
        {a.modalEdicaoAberto && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface-solid border border-border-default w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-border-subtle pb-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Edit2 size={20} className="text-purple-400" /> Editar Horário
                </h3>
                <button onClick={() => a.setModalEdicaoAberto(false)} className="text-text-faint hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>

              <div>
                <p className="text-xs text-text-muted mb-1 uppercase tracking-wider font-bold">Funcionário</p>
                <p className="font-bold text-text-primary text-lg">{a.pontoEmEdicao?.usuario?.nome}</p>
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-1 uppercase tracking-wider font-bold">Novo Horário</label>
                <input
                  type="time"
                  value={a.novaHora}
                  onChange={(e) => a.setNovaHora(e.target.value)}
                  className="w-full bg-page border border-border-input p-4 rounded-xl text-text-primary text-2xl font-bold text-center focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-1 uppercase tracking-wider font-bold">Motivo</label>
                <input
                  type="text"
                  value={a.motivoEdicao}
                  onChange={(e) => a.setMotivoEdicao(e.target.value)}
                  placeholder="Justificativa..."
                  className="w-full bg-page border border-border-input p-3 rounded-xl text-text-primary text-sm outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={a.salvarEdicaoPonto}
                disabled={a.salvandoEdicao || !a.motivoEdicao}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-elevated-solid disabled:text-text-faint text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 transition-all"
              >
                {a.salvandoEdicao ? (
                  'Salvando...'
                ) : (
                  <>
                    <Save size={18} /> Salvar Alteração
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* === MODAL LANÇAR AUSÊNCIA (já separado) === */}
        <ModalLancarAusencia
          aberto={a.modalAusenciaAberto}
          onClose={() => a.setModalAusenciaAberto(false)}
          usuarios={a.usuarios}
          ausenciaUser={a.ausenciaUser}
          setAusenciaUser={a.setAusenciaUser}
          ausenciaTipo={a.ausenciaTipo}
          setAusenciaTipo={a.setAusenciaTipo}
          ausenciaInicio={a.ausenciaInicio}
          setAusenciaInicio={a.setAusenciaInicio}
          ausenciaFim={a.ausenciaFim}
          setAusenciaFim={a.setAusenciaFim}
          ausenciaMotivo={a.ausenciaMotivo}
          setAusenciaMotivo={a.setAusenciaMotivo}

          // ✅ NOVO — PASSAR AS HORAS
          ausenciaHoraInicio={a.ausenciaHoraInicio}
          setAusenciaHoraInicio={a.setAusenciaHoraInicio}
          ausenciaHoraFim={a.ausenciaHoraFim}
          setAusenciaHoraFim={a.setAusenciaHoraFim}

          salvando={a.salvandoAusencia}
          onConfirmar={a.salvarAusenciaAdmin}
        />

        {/* === MODAL EDITAR JORNADA (já separado) === */}
        {a.modalJornadaAberto && a.filtroUsuario && (
          <ModalEditarJornada
            usuario={a.usuarios.find((u) => u.id === a.filtroUsuario)}
            aoFechar={() => a.setModalJornadaAberto(false)}
            aoSalvar={a.carregarDados}
          />
        )}

      </div>
    </div>
  );
}
