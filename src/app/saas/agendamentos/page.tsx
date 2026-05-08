'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  MessageCircle,
  Mail,
  Building2,
  User as UserIcon,
  RefreshCw,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarOff,
  Save,
  Briefcase,
  List,
  CalendarDays,
} from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import CalendarioSemanal from './_components/CalendarioSemanal';

const TZ = 'America/Sao_Paulo';

type LeadResumo = {
  id: string;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  empresa: string | null;
  origem: string;
  obs: string | null;
  criadoEm: string;
};

type Agendamento = {
  id: string;
  dataHora: string;
  duracaoMinutos: number;
  status: string;
  atendenteId: string | null;
  leadId: string | null;
  alteradoPor: string | null;
  alteradoEm: string | null;
  observacao: string | null;
  criadoEm: string;
  lead: LeadResumo | null;
};

type Resumo = {
  totalPendentes: number;
  totalConfirmados: number;
  totalRealizados: number;
  totalCancelados: number;
  totalNoShow: number;
};

const STATUS_OPCOES = [
  { id: 'PENDENTE',    label: 'Pendente',    cor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'CONFIRMADO',  label: 'Confirmado',  cor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'REALIZADO',   label: 'Realizado',   cor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'CANCELADO',   label: 'Cancelado',   cor: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  { id: 'NO_SHOW',     label: 'No-show',     cor: 'bg-red-500/20 text-red-300 border-red-500/30' },
];

const ORIGEM_LABEL: Record<string, string> = {
  AGENDAR_DEMO: 'Demo',
  SIGNUP: 'Cadastro',
  CONTATO: 'Contato',
};

function statusBadgeClass(status: string) {
  return STATUS_OPCOES.find(o => o.id === status)?.cor ?? 'bg-slate-700 text-slate-300';
}

function whatsappLink(numero: string | null) {
  if (!numero) return '';
  const digits = numero.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('55') ? digits : '55' + digits}`;
}

function formatarDia(iso: string) {
  return formatInTimeZone(new Date(iso), TZ, "EEEE, dd 'de' MMM", { locale: ptBR });
}

function formatarHora(iso: string) {
  return formatInTimeZone(new Date(iso), TZ, 'HH:mm');
}

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const [filtroStatus, setFiltroStatus] = useState('');
  const [escopo, setEscopo] = useState<'futuros' | 'todos' | 'passados'>('futuros');
  const [busca, setBusca] = useState('');
  const [view, setView] = useState<'lista' | 'calendario'>('calendario');

  const [obsAberto, setObsAberto] = useState<string | null>(null);
  const [obsTexto, setObsTexto] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set('status', filtroStatus);
      if (escopo) params.set('escopo', escopo);
      if (busca.trim()) params.set('q', busca.trim());

      const res = await fetch(`/api/saas/agendamentos?${params.toString()}`);
      if (!res.ok) throw new Error('erro');
      const data = await res.json();
      setAgendamentos(data.agendamentos);
      setResumo(data.resumo);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [filtroStatus, escopo]);

  useEffect(() => {
    const t = setTimeout(() => carregar(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [busca]);

  const atualizar = async (id: string, patch: { status?: string; observacao?: string }) => {
    setSalvandoId(id);
    try {
      const res = await fetch('/api/saas/agendamentos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgendamentos(prev => prev.map(a => (a.id === id ? { ...a, ...data.agendamento, lead: a.lead } : a)));
      }
    } finally {
      setSalvandoId(null);
    }
  };

  const totais = useMemo(() => {
    if (!resumo) return null;
    return [
      { label: 'Pendentes',    n: resumo.totalPendentes,   cor: 'text-amber-400' },
      { label: 'Confirmados',  n: resumo.totalConfirmados, cor: 'text-blue-400' },
      { label: 'Realizados',   n: resumo.totalRealizados,  cor: 'text-emerald-400' },
      { label: 'No-show',      n: resumo.totalNoShow,      cor: 'text-red-400' },
    ];
  }, [resumo]);

  return (
    <>
      <header className="sticky top-14 lg:top-0 z-10 border-b border-border-subtle bg-page/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/saas"
              className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
            >
              <ArrowLeft size={16} /> Painel
            </Link>
            <span className="text-text-faint">/</span>
            <h1 className="text-lg font-bold">Agendamentos</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-xl border border-border-subtle bg-elevated overflow-hidden">
              <button
                onClick={() => setView('lista')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                  view === 'lista'
                    ? 'bg-purple-500/20 text-purple-200'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                aria-pressed={view === 'lista'}
              >
                <List size={14} /> Lista
              </button>
              <button
                onClick={() => setView('calendario')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l border-border-subtle ${
                  view === 'calendario'
                    ? 'bg-purple-500/20 text-purple-200'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                aria-pressed={view === 'calendario'}
              >
                <CalendarDays size={14} /> Calendário
              </button>
            </div>

            <button
              onClick={carregar}
              className="inline-flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-secondary px-3 py-2 rounded-xl border border-border-subtle text-sm transition-colors"
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Resumo */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {totais?.map(t => (
            <div key={t.label} className="rounded-2xl border border-border-subtle bg-elevated/40 p-4">
              <div className="text-xs uppercase tracking-wider text-text-muted">{t.label}</div>
              <div className={`text-3xl font-extrabold mt-1 ${t.cor}`}>{t.n}</div>
            </div>
          ))}
        </section>

        {/* Filtros */}
        <section className="rounded-2xl border border-border-subtle bg-elevated/40 p-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs text-text-muted">Buscar</label>
            <div className="relative mt-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, WhatsApp, empresa..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm placeholder:text-text-faint"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm"
            >
              <option value="">Todos</option>
              {STATUS_OPCOES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-text-muted">Período</label>
            <select
              value={escopo}
              onChange={(e) => setEscopo(e.target.value as typeof escopo)}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm"
            >
              <option value="futuros">A partir de hoje</option>
              <option value="todos">Todos</option>
              <option value="passados">Passados</option>
            </select>
          </div>
        </section>

        {/* Calendário */}
        {view === 'calendario' && (
          <section>
            {loading && agendamentos.length === 0 ? (
              <div className="text-center py-16 text-text-muted">
                <Loader2 className="animate-spin mx-auto mb-3" />
                Carregando…
              </div>
            ) : (
              <CalendarioSemanal
                agendamentos={agendamentos}
                onAtualizar={atualizar}
                salvandoId={salvandoId}
              />
            )}
          </section>
        )}

        {/* Lista */}
        {view === 'lista' && (
        <section className="space-y-3">
          {loading && agendamentos.length === 0 && (
            <div className="text-center py-16 text-text-muted">
              <Loader2 className="animate-spin mx-auto mb-3" />
              Carregando…
            </div>
          )}

          {!loading && agendamentos.length === 0 && (
            <div className="rounded-2xl border border-border-subtle bg-elevated/40 p-10 text-center">
              <CalendarOff className="mx-auto text-text-faint mb-2" />
              <p className="text-text-muted">Nenhum agendamento com esses filtros.</p>
            </div>
          )}

          {agendamentos.map(a => {
            const passou = new Date(a.dataHora).getTime() < Date.now();
            const lead = a.lead;
            const obsEditando = obsAberto === a.id;
            return (
              <article
                key={a.id}
                className="rounded-2xl border border-border-subtle bg-elevated/40 p-4 md:p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-3 text-purple-300">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="text-sm text-text-muted capitalize">{formatarDia(a.dataHora)}</div>
                      <div className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                        <Clock size={18} className="text-text-muted" /> {formatarHora(a.dataHora)}
                        <span className="text-xs font-normal text-text-faint">· {a.duracaoMinutos}min</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold ${statusBadgeClass(a.status)}`}
                    >
                      {STATUS_OPCOES.find(s => s.id === a.status)?.label ?? a.status}
                    </span>
                    {lead && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full border border-border-subtle bg-page/40 text-xs text-text-muted">
                        {ORIGEM_LABEL[lead.origem] ?? lead.origem}
                      </span>
                    )}
                    {passou && a.status === 'PENDENTE' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-xs text-red-300">
                        atrasado
                      </span>
                    )}
                  </div>
                </div>

                {/* Lead */}
                {lead && (
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <UserIcon size={14} className="text-text-muted" />
                      <strong className="text-text-primary">{lead.nome}</strong>
                    </div>
                    {lead.empresa && (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Building2 size={14} className="text-text-muted" />
                        {lead.empresa}
                      </div>
                    )}
                    {lead.whatsapp && (
                      <a
                        href={whatsappLink(lead.whatsapp)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
                      >
                        <MessageCircle size={14} />
                        {lead.whatsapp}
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
                      >
                        <Mail size={14} className="text-text-muted" />
                        {lead.email}
                      </a>
                    )}
                  </div>
                )}

                {/* Ações */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-subtle/60">
                  <select
                    value={a.status}
                    onChange={(e) => atualizar(a.id, { status: e.target.value })}
                    disabled={salvandoId === a.id}
                    className="px-3 py-1.5 rounded-xl bg-page/50 border border-border-subtle text-sm"
                  >
                    {STATUS_OPCOES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>

                  {a.status === 'PENDENTE' && (
                    <button
                      onClick={() => atualizar(a.id, { status: 'CONFIRMADO' })}
                      disabled={salvandoId === a.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-sm"
                    >
                      <CheckCircle2 size={14} /> Confirmar
                    </button>
                  )}

                  {a.status === 'CONFIRMADO' && (
                    <button
                      onClick={() => atualizar(a.id, { status: 'REALIZADO' })}
                      disabled={salvandoId === a.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-sm"
                    >
                      <CheckCircle2 size={14} /> Marcar realizado
                    </button>
                  )}

                  {(a.status === 'PENDENTE' || a.status === 'CONFIRMADO') && (
                    <button
                      onClick={() => atualizar(a.id, { status: 'CANCELADO' })}
                      disabled={salvandoId === a.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-500/30 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 text-sm"
                    >
                      <XCircle size={14} /> Cancelar
                    </button>
                  )}

                  {lead && a.status !== 'CANCELADO' && (
                    <Link
                      href={`/saas/venda?${new URLSearchParams({
                        leadId: lead.id,
                        nomeEmpresa: lead.empresa || '',
                        nomeDono: lead.nome,
                        emailDono: lead.email || '',
                      }).toString()}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-sm"
                    >
                      <Briefcase size={14} /> Criar empresa cliente
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      if (obsAberto === a.id) {
                        setObsAberto(null);
                      } else {
                        setObsAberto(a.id);
                        setObsTexto(a.observacao || '');
                      }
                    }}
                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-page/40 text-text-secondary hover:text-text-primary text-sm"
                  >
                    {obsEditando ? 'Fechar' : (a.observacao ? 'Editar nota' : 'Adicionar nota')}
                  </button>
                </div>

                {obsEditando && (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={obsTexto}
                      onChange={(e) => setObsTexto(e.target.value)}
                      rows={3}
                      placeholder="Anotação interna sobre esse agendamento…"
                      className="w-full px-3 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm placeholder:text-text-faint"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setObsAberto(null)}
                        className="px-3 py-1.5 rounded-xl border border-border-subtle text-sm text-text-muted hover:text-text-primary"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          await atualizar(a.id, { observacao: obsTexto });
                          setObsAberto(null);
                        }}
                        disabled={salvandoId === a.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold"
                      >
                        {salvandoId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Salvar
                      </button>
                    </div>
                  </div>
                )}

                {!obsEditando && a.observacao && (
                  <p className="text-sm text-text-secondary bg-page/40 border border-border-subtle/50 rounded-xl px-3 py-2 italic">
                    {a.observacao}
                  </p>
                )}

                {a.alteradoPor && a.alteradoEm && (
                  <p className="text-[11px] text-text-faint">
                    Última alteração por {a.alteradoPor} em{' '}
                    {formatInTimeZone(new Date(a.alteradoEm), TZ, "dd/MM 'às' HH:mm")}
                  </p>
                )}
              </article>
            );
          })}
        </section>
        )}
      </main>
    </>
  );
}
