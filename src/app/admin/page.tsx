'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  LogOut,
  Bell,
  AlertCircle,
  ShieldAlert,
  CalendarDays,
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
import FinanceAlertBanner from '@/components/admin/FinanceAlertBanner';





export default function AdminDashboard() {
  const a = useAdminDashboard();

  if (a.loading)
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400 gap-3">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        Carregando painel...
      </div>
    );


    
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-purple-500/30 relative overflow-x-hidden">
      {/* Efeitos de Fundo */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* <FinanceAlertBanner alertaFinanceiro={a.alertaFinanceiro} /> */}

      {/* Toast */}
      {a.notificacaoVisivel && (
        <div
          className={`fixed top-16 right-6 z-[100] animate-in slide-in-from-right duration-500 fade-in ${
            a.alertaFinanceiro ? 'mt-12' : ''
          }`}
        >
          <Link href={a.pendenciasAjuste > 0 ? '/admin/solicitacoes' : '/admin/pendencias'}>
            <div className="bg-purple-600 text-white p-4 rounded-xl shadow-2xl border border-purple-400 flex items-center gap-4 cursor-pointer hover:bg-purple-700 hover:scale-105 transition-all">
              <div className="bg-white p-2 rounded-full animate-bounce text-purple-600">
                <Bell size={24} fill="currentColor" />
              </div>
              <div>
                <p className="font-bold text-sm">Novas Pendências!</p>
                <div className="text-xs text-purple-100 flex flex-col">
                  {a.pendenciasAjuste > 0 && <span>• {a.pendenciasAjuste} Ajuste(s)</span>}
                  {a.pendenciasAusencia > 0 && <span>• {a.pendenciasAusencia} Justificativa(s)</span>}
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className={`max-w-7xl mx-auto p-4 md:p-8 relative z-10 space-y-8 ${a.alertaFinanceiro ? 'mt-8' : ''}`}>
        {/* === CABEÇALHO === */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
                <LayoutDashboard size={20} className="text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{a.empresa.nome}</h1>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Painel Administrativo</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="flex-1 xl:flex-none">
              <SeletorLoja empresaAtualId={a.empresa.id} empresaAtualNome={a.empresa.nome} />
            </div>

            <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur border border-white/5 p-1.5 rounded-xl">
              <Link
                href="/admin/perfil"
                className="p-2.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Minha Conta"
              >
                <User size={18} />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* === AÇÕES RÁPIDAS === */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <button
              onClick={a.abrirModalAusencia}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all shadow-lg shadow-black/20 hover:-translate-y-1"
            >
              <Plane size={24} />
              <span className="text-xs font-bold">Lançar Ausência</span>
            </button>

            <Link
              href="/admin/solicitacoes"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-white/5 rounded-2xl transition-all hover:border-purple-500/30 hover:-translate-y-1 relative group"
            >
              <div className="bg-purple-500/10 p-2 rounded-full group-hover:bg-purple-500/20 transition-colors">
                <AlertCircle size={20} className="text-purple-400" />
              </div>
              <span className="text-xs font-bold">Ajustes</span>
              {a.pendenciasAjuste > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-slate-900">
                  {a.pendenciasAjuste}
                </span>
              )}
            </Link>

            {!a.configs.ocultar_menu_atestados && (
              <Link
                href="/admin/pendencias"
                className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-white/5 rounded-2xl transition-all hover:border-yellow-500/30 hover:-translate-y-1 relative group"
              >
                <div className="bg-yellow-500/10 p-2 rounded-full group-hover:bg-yellow-500/20 transition-colors">
                  <ShieldAlert size={20} className="text-yellow-400" />
                </div>
                <span className="text-xs font-bold">Atestados</span>
                {a.pendenciasAusencia > 0 && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-slate-900">
                    {a.pendenciasAusencia}
                  </span>
                )}
              </Link>
            )}

            <Link
              href="/admin/funcionarios"
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all hover:-translate-y-1 group
                        bg-slate-800/60 hover:bg-slate-800
                        text-slate-100
                        border border-white/10 hover:border-white/25
                        ring-1 ring-fuchsia-500/25 hover:ring-fuchsia-400/40
                        shadow-lg shadow-fuchsia-900/10"
            >
              <div className="bg-fuchsia-500/10 p-2 rounded-full group-hover:bg-fuchsia-500/15 transition-colors">
                <User size={20} className="text-fuchsia-300 group-hover:text-fuchsia-200" />
              </div>
              <span className="text-xs font-bold">Gestão da Equipe</span>
            </Link>

            <Link
              href="/admin/feriados"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-white/5 rounded-2xl transition-all hover:border-white/20 hover:-translate-y-1 group"
            >
              <div className="bg-white/5 p-2 rounded-full group-hover:bg-white/10 transition-colors">
                <CalendarDays size={20} className="text-slate-400 group-hover:text-white" />
              </div>
              <span className="text-xs font-bold">Feriados</span>
            </Link>

            <Link
              href="/admin/logs"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-white/5 rounded-2xl transition-all hover:border-white/20 hover:-translate-y-1 group"
            >
              <div className="bg-white/5 p-2 rounded-full group-hover:bg-white/10 transition-colors">
                <ScrollText size={20} className="text-slate-400 group-hover:text-white" />
              </div>
              <span className="text-xs font-bold">Auditoria</span>
            </Link>

            <Link
              href="/admin/dashboard"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-white/5 rounded-2xl transition-all hover:border-white/20 hover:-translate-y-1 group"
            >
              <div className="bg-white/5 p-2 rounded-full group-hover:bg-white/10 transition-colors">
                <LayoutDashboard size={20} className="text-slate-400 group-hover:text-white" />
              </div>
              <span className="text-xs font-bold">Visão Geral</span>
            </Link>
          </div>
        </div>

        {/* === FILTROS === */}
        <div className="relative z-20 bg-slate-900/60 backdrop-blur-xl border border-white/5 p-5 rounded-3xl shadow-xl flex flex-col lg:flex-row gap-6 items-end">
          <div className="w-full lg:flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Funcionário</label>

              <div className="flex gap-2">
                <div ref={a.dropdownRef} className="relative flex-1 group">
                  <Search
                    size={16}
                    className="absolute left-3 top-3.5 text-slate-500 group-hover:text-purple-400 transition-colors pointer-events-none"
                  />

                  <button
                    type="button"
                    onClick={() => a.setDropdownAberto((v) => !v)}
                    className="w-full bg-slate-950/50 border border-white/10 hover:border-purple-500/50 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-left cursor-pointer"
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
                      className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-200 transition-colors"
                      title="Limpar filtro"
                    >
                      <X size={16} />
                    </button>
                  )}

                  {a.dropdownAberto && (
                    <div className="absolute z-[60] mt-2 w-full bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                      <div className="p-2 border-b border-white/5">
                        <input
                          autoFocus
                          value={a.buscaFuncionario}
                          onChange={(e) => a.setBuscaFuncionario(e.target.value)}
                          placeholder="Digite o nome ou email..."
                          className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-purple-500/60"
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
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors ${
                            !a.filtroUsuario ? 'text-purple-300' : 'text-slate-200'
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
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors ${
                                a.filtroUsuario === u.id ? 'text-purple-300' : 'text-slate-200'
                              }`}
                              title={u.email || u.nome}
                            >
                              <div className="flex flex-col">
                                <span className="font-semibold truncate">{u.nome}</span>
                                {u.email && <span className="text-[10px] text-slate-500 truncate">{u.email}</span>}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-xs text-slate-500">Nenhum funcionário encontrado.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {a.filtroUsuario && (
                  <button
                    onClick={() => a.setModalJornadaAberto(true)}
                    className="px-3 bg-slate-800 hover:bg-purple-600 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-colors"
                    title="Configurar Escala"
                  >
                    <Clock size={20} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Período</label>
              <div className="flex gap-2 items-center bg-slate-950/50 border border-white/10 rounded-xl p-1">
                <input
                  type="date"
                  value={a.dataInicio}
                  onChange={(e) => a.setDataInicio(e.target.value)}
                  className="bg-transparent text-sm text-slate-300 outline-none p-2 w-full text-center cursor-pointer hover:text-white transition-colors"
                />
                <span className="text-slate-600 text-xs">até</span>
                <input
                  type="date"
                  value={a.dataFim}
                  onChange={(e) => a.setDataFim(e.target.value)}
                  className="bg-transparent text-sm text-slate-300 outline-none p-2 w-full text-center cursor-pointer hover:text-white transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto">
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
                  : 'bg-slate-900/50 border-white/5'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status Atual</h3>
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
                    : 'text-slate-500'
                }`}
              >
                {a.stats.status}
              </p>
              {a.stats.status !== 'Ausente' && (
                <p className="text-xs text-emerald-400/60 mt-1 font-mono">Tempo: {a.stats.tempoAgora}</p>
              )}
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-lg">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Hoje</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{a.stats.hoje}</p>
                <p className="text-[10px] text-slate-500">/ Meta: {a.stats.metaHoje}</p>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-lg">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Total Período</h3>
              <p className="text-2xl font-bold text-white">{a.stats.total}</p>
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
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/5 flex items-center justify-center opacity-50">
                <p className="text-xs text-slate-500">Saldo Oculto</p>
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit2 size={20} className="text-purple-400" /> Editar Horário
                </h3>
                <button onClick={() => a.setModalEdicaoAberto(false)} className="text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-bold">Funcionário</p>
                <p className="font-bold text-white text-lg">{a.pontoEmEdicao?.usuario?.nome}</p>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 uppercase tracking-wider font-bold">Novo Horário</label>
                <input
                  type="time"
                  value={a.novaHora}
                  onChange={(e) => a.setNovaHora(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white text-2xl font-bold text-center focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 uppercase tracking-wider font-bold">Motivo</label>
                <input
                  type="text"
                  value={a.motivoEdicao}
                  onChange={(e) => a.setMotivoEdicao(e.target.value)}
                  placeholder="Justificativa..."
                  className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={a.salvarEdicaoPonto}
                disabled={a.salvandoEdicao || !a.motivoEdicao}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 transition-all"
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
