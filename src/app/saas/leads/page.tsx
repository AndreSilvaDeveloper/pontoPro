'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Calendar,
  MessageCircle,
  Mail,
  Building2,
  User as UserIcon,
  Tag,
  RefreshCw,
  Loader2,
  ChevronDown,
} from 'lucide-react';

type Lead = {
  id: string;
  origem: string;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  empresa: string | null;
  cargo: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrer: string | null;
  dadosExtras: Record<string, unknown> | null;
  status: string;
  obs: string | null;
  criadoEm: string;
};

type Resumo = {
  totalNovos: number;
  totalEmContato: number;
  totalQualificados: number;
  totalConvertidos: number;
  totalDescartados: number;
  ultimosTrintaPorOrigem: Record<string, number>;
};

const STATUS_OPCOES = [
  { id: 'NOVO', label: 'Novo', cor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'EM_CONTATO', label: 'Em contato', cor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'QUALIFICADO', label: 'Qualificado', cor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'CONVERTIDO', label: 'Convertido', cor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'DESCARTADO', label: 'Descartado', cor: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
];

const ORIGEM_LABEL: Record<string, string> = {
  AGENDAR_DEMO: 'Agendamento de demo',
  SIGNUP: 'Cadastro',
  CONTATO: 'Contato',
};

function formatarData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function statusBadgeClass(status: string) {
  return STATUS_OPCOES.find(o => o.id === status)?.cor ?? 'bg-slate-700 text-slate-300';
}

function whatsappLink(numero: string | null) {
  if (!numero) return '';
  const digits = numero.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('55') ? digits : '55' + digits}`;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  // Filtros
  const [filtroOrigem, setFiltroOrigem] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  // Edição inline
  const [obsAberto, setObsAberto] = useState<string | null>(null);
  const [obsTexto, setObsTexto] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroOrigem) params.set('origem', filtroOrigem);
      if (filtroStatus) params.set('status', filtroStatus);
      if (busca.trim()) params.set('q', busca.trim());
      if (inicio) params.set('inicio', inicio);
      if (fim) params.set('fim', fim);

      const res = await fetch(`/api/saas/leads?${params.toString()}`);
      if (!res.ok) throw new Error('erro');
      const data = await res.json();
      setLeads(data.leads);
      setResumo(data.resumo);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [filtroOrigem, filtroStatus, inicio, fim]);

  // busca: aplica com debounce ao digitar
  useEffect(() => {
    const t = setTimeout(() => carregar(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [busca]);

  const atualizar = async (id: string, patch: { status?: string; obs?: string }) => {
    setSalvandoId(id);
    try {
      const res = await fetch('/api/saas/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(prev => prev.map(l => (l.id === id ? data.lead : l)));
      }
    } finally {
      setSalvandoId(null);
    }
  };

  const totais = useMemo(() => {
    if (!resumo) return null;
    return [
      { label: 'Novos', n: resumo.totalNovos, cor: 'text-blue-400' },
      { label: 'Em contato', n: resumo.totalEmContato, cor: 'text-amber-400' },
      { label: 'Qualificados', n: resumo.totalQualificados, cor: 'text-purple-400' },
      { label: 'Convertidos', n: resumo.totalConvertidos, cor: 'text-emerald-400' },
    ];
  }, [resumo]);

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-page/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/saas"
              className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
            >
              <ArrowLeft size={16} /> Painel
            </Link>
            <span className="text-text-faint">/</span>
            <h1 className="text-lg font-bold">Leads</h1>
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

        {/* Resumo por origem (últimos 30 dias) */}
        {resumo && Object.keys(resumo.ultimosTrintaPorOrigem).length > 0 && (
          <section className="rounded-2xl border border-border-subtle bg-elevated/40 p-4">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
              Últimos 30 dias por origem
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(resumo.ultimosTrintaPorOrigem).map(([origem, n]) => (
                <span
                  key={origem}
                  className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-page/50 px-3 py-1 text-sm"
                >
                  <Tag size={12} className="text-text-muted" />
                  {ORIGEM_LABEL[origem] ?? origem}: <strong className="text-text-primary">{n}</strong>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Filtros */}
        <section className="rounded-2xl border border-border-subtle bg-elevated/40 p-4 grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="text-xs text-text-muted">Buscar</label>
            <div className="relative mt-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, email, WhatsApp, empresa..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm placeholder:text-text-faint"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted">Origem</label>
            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm"
            >
              <option value="">Todas</option>
              <option value="AGENDAR_DEMO">Agendamento de demo</option>
              <option value="SIGNUP">Cadastro</option>
              <option value="CONTATO">Contato</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-text-muted">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm"
            >
              <option value="">Todos</option>
              {STATUS_OPCOES.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-muted">De</label>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full mt-1 px-2 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Até</label>
              <input
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full mt-1 px-2 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm"
              />
            </div>
          </div>
        </section>

        {/* Lista */}
        <section className="rounded-2xl border border-border-subtle bg-elevated/40 overflow-hidden">
          {loading && leads.length === 0 ? (
            <div className="p-12 text-center text-text-muted">
              <Loader2 className="mx-auto animate-spin mb-2" /> Carregando…
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-text-muted">
              Nenhum lead com esses filtros.
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {leads.map(lead => (
                <article key={lead.id} className="p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 border ${statusBadgeClass(lead.status)}`}>
                          {STATUS_OPCOES.find(o => o.id === lead.status)?.label ?? lead.status}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 border border-border-subtle text-text-muted">
                          {ORIGEM_LABEL[lead.origem] ?? lead.origem}
                        </span>
                        <span className="text-xs text-text-faint inline-flex items-center gap-1">
                          <Calendar size={12} /> {formatarData(lead.criadoEm)}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold mt-2 inline-flex items-center gap-2">
                        <UserIcon size={14} className="text-text-muted" /> {lead.nome}
                      </h3>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                        {lead.empresa && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={12} className="text-text-faint" /> {lead.empresa}
                          </span>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="inline-flex items-center gap-1 hover:text-purple-300"
                          >
                            <Mail size={12} className="text-text-faint" /> {lead.email}
                          </a>
                        )}
                        {lead.whatsapp && (
                          <a
                            href={whatsappLink(lead.whatsapp)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-emerald-300"
                          >
                            <MessageCircle size={12} className="text-text-faint" /> {lead.whatsapp}
                          </a>
                        )}
                      </div>

                      {/* Detalhes da origem (data/horário do agendamento, plano, etc) */}
                      {lead.dadosExtras && Object.keys(lead.dadosExtras).length > 0 && (
                        <div className="mt-2 text-xs text-text-muted flex flex-wrap gap-x-3">
                          {Object.entries(lead.dadosExtras).map(([k, v]) => (
                            <span key={k}>
                              <span className="text-text-faint">{k}:</span> {String(v)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* UTMs / Atribuição */}
                      {(lead.utmSource || lead.utmCampaign || lead.referrer) && (
                        <div className="mt-2 text-[11px] text-text-faint flex flex-wrap gap-x-3">
                          {lead.utmSource && <span>utm_source: <span className="text-text-muted">{lead.utmSource}</span></span>}
                          {lead.utmMedium && <span>utm_medium: <span className="text-text-muted">{lead.utmMedium}</span></span>}
                          {lead.utmCampaign && <span>utm_campaign: <span className="text-text-muted">{lead.utmCampaign}</span></span>}
                          {lead.referrer && <span>ref: <span className="text-text-muted">{lead.referrer}</span></span>}
                        </div>
                      )}

                      {/* Observações */}
                      {obsAberto === lead.id ? (
                        <div className="mt-3">
                          <textarea
                            value={obsTexto}
                            onChange={(e) => setObsTexto(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm"
                            placeholder="Anotações sobre esse lead..."
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={async () => {
                                await atualizar(lead.id, { obs: obsTexto });
                                setObsAberto(null);
                              }}
                              className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-3 py-1.5 rounded-lg"
                              disabled={salvandoId === lead.id}
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setObsAberto(null)}
                              className="text-text-muted hover:text-text-primary text-sm px-3 py-1.5"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          {lead.obs && <p className="text-sm text-text-secondary whitespace-pre-wrap">{lead.obs}</p>}
                          <button
                            onClick={() => { setObsAberto(lead.id); setObsTexto(lead.obs ?? ''); }}
                            className="text-xs text-purple-300 hover:text-purple-200 mt-1"
                          >
                            {lead.obs ? 'Editar observação' : '+ Adicionar observação'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2 md:items-end shrink-0">
                      <div className="flex gap-2">
                        {lead.whatsapp && (
                          <a
                            href={whatsappLink(lead.whatsapp)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 px-3 py-1.5 rounded-lg text-sm border border-emerald-500/30"
                          >
                            <MessageCircle size={14} /> WhatsApp
                          </a>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="inline-flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 px-3 py-1.5 rounded-lg text-sm border border-indigo-500/30"
                          >
                            <Mail size={14} /> Email
                          </a>
                        )}
                      </div>

                      <div className="relative">
                        <select
                          value={lead.status}
                          onChange={(e) => atualizar(lead.id, { status: e.target.value })}
                          disabled={salvandoId === lead.id}
                          className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm border ${statusBadgeClass(lead.status)}`}
                        >
                          {STATUS_OPCOES.map(o => (
                            <option key={o.id} value={o.id}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-faint" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
