'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Settings,
  Loader2,
  Check,
  Edit3,
  X as XIcon,
  Package,
  Users,
  AlertCircle,
  RefreshCcw,
  Building2,
  CalendarDays,
  CreditCard,
  Phone,
  Cog,
  MessageSquare,
  ChevronDown,
  Clock,
} from 'lucide-react';

type Config = {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  descricao: string | null;
  categoria: string | null;
  atualizadoEm: string;
};

type Plano = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  maxFuncionarios: number;
  maxAdmins: number;
  maxFiliais: number;
  extraFuncionario: number;
  extraAdmin: number;
  reconhecimentoFacial: boolean;
  totemIncluso: boolean;
  totemAddonMatriz: number;
};

type EmpresaNegociada = {
  id: string;
  nome: string;
  plano: string;
  precoNegociado: number;
  precoNegociadoMotivo: string | null;
  precoNegociadoExpiraEm: string | null;
};

type Data = {
  configs: Config[];
  planos: Plano[];
  empresasNegociadas: EmpresaNegociada[];
};

type AbaId = 'geral' | 'cobranca' | 'agendamento' | 'mensagens' | 'contato' | 'planos';

const ABAS: { id: AbaId; label: string; icon: any; cor: string }[] = [
  { id: 'geral', label: 'Geral', icon: Cog, cor: 'text-slate-300 bg-slate-500/15 border-slate-500/30' },
  { id: 'cobranca', label: 'Cobrança', icon: CreditCard, cor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  { id: 'agendamento', label: 'Agendamento', icon: CalendarDays, cor: 'text-blue-300 bg-blue-500/15 border-blue-500/30' },
  { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, cor: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  { id: 'contato', label: 'Contato', icon: Phone, cor: 'text-pink-300 bg-pink-500/15 border-pink-500/30' },
  { id: 'planos', label: 'Planos', icon: Package, cor: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-500/30' },
];

// Chave da config "janelas" — renderizamos uma UI dedicada e ocultamos da listagem genérica.
const CHAVE_JANELAS = 'agendamento.janelas';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ConfiguracoesPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<AbaId>('geral');
  const [mobileAbaOpen, setMobileAbaOpen] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/saas/configuracoes');
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const salvarConfig = async (chave: string, valor: string) => {
    await axios.put('/api/saas/configuracoes', { chave, valor });
    await carregar();
  };

  const configsPorCategoria = useMemo(() => {
    const map: Record<string, Config[]> = {};
    if (!data) return map;
    for (const c of data.configs) {
      const cat = c.categoria || 'geral';
      if (!map[cat]) map[cat] = [];
      // Oculta a config de janelas — ela tem UI própria.
      if (c.chave === CHAVE_JANELAS) continue;
      map[cat].push(c);
    }
    return map;
  }, [data]);

  const abaAtual = ABAS.find(a => a.id === abaAtiva)!;

  return (
    <>
      <header className="sticky top-14 lg:top-0 z-10 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
              <Settings size={18} className="text-purple-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-text-primary truncate">Configurações</h1>
              <p className="text-[11px] text-text-muted">Sistema, mensagens, agendamento e visualização de planos</p>
            </div>
          </div>
          <button
            onClick={carregar}
            disabled={loading}
            className="flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-secondary px-3 py-2 rounded-xl border border-border-subtle text-xs sm:text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-purple-400" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-text-muted text-sm">Erro ao carregar configurações.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
            {/* Sidebar de abas (desktop) */}
            <aside className="hidden lg:block">
              <nav className="space-y-1 sticky top-32">
                {ABAS.map(a => {
                  const Icon = a.icon;
                  const ativa = a.id === abaAtiva;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setAbaAtiva(a.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                        ativa
                          ? 'bg-purple-500/15 border border-purple-500/30 text-text-primary font-medium'
                          : 'border border-transparent text-text-secondary hover:bg-hover-bg hover:text-text-primary'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${a.cor}`}>
                        <Icon size={13} />
                      </span>
                      <span>{a.label}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Dropdown de abas (mobile) */}
            <div className="lg:hidden relative">
              <button
                onClick={() => setMobileAbaOpen(v => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-border-subtle bg-surface text-sm font-medium text-text-primary"
              >
                <span className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${abaAtual.cor}`}>
                    <abaAtual.icon size={13} />
                  </span>
                  {abaAtual.label}
                </span>
                <ChevronDown size={14} className={`transition-transform ${mobileAbaOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileAbaOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-surface border border-border-subtle rounded-xl shadow-xl overflow-hidden">
                  {ABAS.map(a => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.id}
                        onClick={() => { setAbaAtiva(a.id); setMobileAbaOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                          a.id === abaAtiva ? 'bg-purple-500/15 text-text-primary' : 'text-text-secondary hover:bg-hover-bg'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${a.cor}`}>
                          <Icon size={13} />
                        </span>
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Conteúdo da aba */}
            <section className="space-y-6 min-w-0">
              {abaAtiva === 'planos' ? (
                <PlanosTab data={data} />
              ) : (
                <>
                  {/* Sub-seção dedicada para janelas, quando a aba for "agendamento" */}
                  {abaAtiva === 'agendamento' && (
                    <JanelasCard
                      config={data.configs.find(c => c.chave === CHAVE_JANELAS) || null}
                      onSave={salvarConfig}
                    />
                  )}

                  <ListaConfigs
                    items={configsPorCategoria[abaAtiva] || []}
                    aba={abaAtual}
                    onSave={salvarConfig}
                  />
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function ListaConfigs({
  items,
  aba,
  onSave,
}: {
  items: Config[];
  aba: typeof ABAS[number];
  onSave: (chave: string, valor: string) => Promise<void>;
}) {
  const Icon = aba.icon;
  return (
    <section className="bg-surface border border-border-subtle rounded-2xl backdrop-blur overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle flex items-center gap-2">
        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${aba.cor}`}>
          <Icon size={13} />
        </span>
        <h2 className="text-sm font-bold text-text-primary">{aba.label}</h2>
        <span className="text-[10px] text-text-faint">· {items.length} config{items.length === 1 ? '' : 's'}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-text-muted">
          Nenhuma configuração nesta seção ainda.
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {items.map(c => (
            <ConfigRow key={c.id} config={c} onSave={onSave} />
          ))}
        </div>
      )}
    </section>
  );
}

function PlanosTab({ data }: { data: Data }) {
  return (
    <>
      <section className="bg-surface border border-border-subtle rounded-2xl backdrop-blur overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Package size={13} className="text-emerald-300" />
          </span>
          <h2 className="text-sm font-bold text-text-primary">Planos vigentes</h2>
          <span className="text-[10px] text-text-faint">· somente leitura</span>
        </div>
        <div className="p-5 grid gap-3 grid-cols-1 md:grid-cols-3">
          {data.planos.map(p => (
            <div key={p.id} className="border border-border-subtle rounded-xl p-4 space-y-2 bg-page/40">
              <div className="flex items-baseline justify-between">
                <h3 className="font-bold text-text-primary">{p.nome}</h3>
                <span className="text-lg font-bold text-emerald-300">{formatBRL(p.preco)}</span>
              </div>
              <p className="text-[11px] text-text-muted">{p.descricao}</p>
              <ul className="text-[12px] text-text-secondary space-y-0.5 pt-2 border-t border-border-subtle">
                <li>👥 Até {p.maxFuncionarios} funcionários (extra: {formatBRL(p.extraFuncionario)})</li>
                <li>🛡️ Até {p.maxAdmins} admin{p.maxAdmins === 1 ? '' : 's'}</li>
                <li>🏢 {p.maxFiliais < 0 ? 'Filiais ilimitadas' : `${p.maxFiliais} filia${p.maxFiliais === 1 ? 'l' : 'is'}`}</li>
                <li>{p.reconhecimentoFacial ? '✅' : '❌'} Reconhecimento facial</li>
                <li>{p.totemIncluso ? '✅ Totem incluso' : `📺 Totem +${formatBRL(p.totemAddonMatriz)}`}</li>
              </ul>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-amber-500/5 border-t border-amber-500/20 text-[11px] text-amber-200">
          💡 Para alterar preços/limites, edite <code className="px-1.5 py-0.5 rounded bg-amber-500/15 font-mono">src/config/planos.ts</code> e faça deploy. Edição em tempo real exige refatoração — pode ser feita quando os planos virarem instáveis.
        </div>
      </section>

      <section className="bg-surface border border-border-subtle rounded-2xl backdrop-blur overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center">
            <Users size={13} className="text-fuchsia-300" />
          </span>
          <h2 className="text-sm font-bold text-text-primary">Preços negociados</h2>
          <span className="text-[10px] text-text-faint">· {data.empresasNegociadas.length} empresa{data.empresasNegociadas.length === 1 ? '' : 's'}</span>
        </div>
        {data.empresasNegociadas.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-text-muted">
            Nenhuma empresa com preço negociado vigente.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-text-faint uppercase tracking-wider border-b border-border-subtle">
                <th className="text-left font-medium px-4 py-2">Empresa</th>
                <th className="text-left font-medium px-4 py-2 hidden sm:table-cell">Plano base</th>
                <th className="text-right font-medium px-4 py-2">Negociado</th>
                <th className="text-left font-medium px-4 py-2 hidden md:table-cell">Motivo</th>
                <th className="text-left font-medium px-4 py-2">Validade</th>
              </tr>
            </thead>
            <tbody>
              {data.empresasNegociadas.map(e => (
                <tr key={e.id} className="border-b border-border-subtle hover:bg-hover-bg transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/saas/${e.id}`} className="font-medium text-text-primary hover:text-purple-300 flex items-center gap-1.5">
                      <Building2 size={12} className="text-text-faint" />
                      {e.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-text-muted hidden sm:table-cell">{e.plano}</td>
                  <td className="px-4 py-2.5 text-right text-fuchsia-300 font-medium">{formatBRL(e.precoNegociado)}</td>
                  <td className="px-4 py-2.5 text-text-muted hidden md:table-cell text-xs">
                    {e.precoNegociadoMotivo || <em className="text-text-faint">sem motivo</em>}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted text-xs">
                    {e.precoNegociadoExpiraEm
                      ? new Date(e.precoNegociadoExpiraEm).toLocaleDateString('pt-BR')
                      : <em className="text-text-faint">sem prazo</em>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

// ─── Janelas de atendimento (UI dedicada) ──────────────────────────────────────

type JanelaDia = { inicio: number; fim: number } | null;
type Janelas = Record<string, JanelaDia>;

const DIAS_SEMANA: { idx: string; label: string }[] = [
  { idx: '0', label: 'Domingo' },
  { idx: '1', label: 'Segunda' },
  { idx: '2', label: 'Terça' },
  { idx: '3', label: 'Quarta' },
  { idx: '4', label: 'Quinta' },
  { idx: '5', label: 'Sexta' },
  { idx: '6', label: 'Sábado' },
];

function horaParaStr(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

function strParaHora(s: string): number | null {
  const m = /^(\d{1,2}):00$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  return h >= 0 && h <= 24 ? h : null;
}

function parseJanelas(raw: string | null | undefined): Janelas {
  if (!raw) return {};
  try {
    const j = JSON.parse(raw);
    return j && typeof j === 'object' ? (j as Janelas) : {};
  } catch {
    return {};
  }
}

function JanelasCard({
  config,
  onSave,
}: {
  config: Config | null;
  onSave: (chave: string, valor: string) => Promise<void>;
}) {
  const [janelas, setJanelas] = useState<Janelas>(() => parseJanelas(config?.valor));
  const [salvando, setSalvando] = useState(false);
  const [original, setOriginal] = useState<string>(config?.valor || '');

  useEffect(() => {
    setJanelas(parseJanelas(config?.valor));
    setOriginal(config?.valor || '');
  }, [config?.valor]);

  const sujo = JSON.stringify(janelas) !== original;

  const toggleDia = (idx: string) => {
    setJanelas(prev => {
      const ativo = !!prev[idx];
      return {
        ...prev,
        [idx]: ativo ? null : { inicio: 9, fim: 18 },
      };
    });
  };

  const atualizar = (idx: string, campo: 'inicio' | 'fim', valor: number) => {
    setJanelas(prev => {
      const atual = prev[idx];
      if (!atual) return prev;
      return { ...prev, [idx]: { ...atual, [campo]: valor } };
    });
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      // Validação: fim > inicio em todos os dias ativos
      for (const d of DIAS_SEMANA) {
        const j = janelas[d.idx];
        if (j && j.fim <= j.inicio) {
          toast.error(`${d.label}: horário fim precisa ser maior que o início.`);
          setSalvando(false);
          return;
        }
      }
      await onSave(CHAVE_JANELAS, JSON.stringify(janelas));
      toast.success('Janelas de atendimento atualizadas. A landing já reflete a mudança.');
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const cancelar = () => setJanelas(parseJanelas(original));

  return (
    <section className="bg-surface border border-border-subtle rounded-2xl backdrop-blur overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
          <Clock size={13} className="text-blue-300" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-text-primary">Janelas de atendimento</h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            Dias e horários em que o lead pode agendar demo. Salvou → a landing atualiza no próximo carregamento (cache de 1 min).
          </p>
        </div>
      </div>

      <div className="divide-y divide-border-subtle">
        {DIAS_SEMANA.map(d => {
          const j = janelas[d.idx];
          const ativo = !!j;
          return (
            <div key={d.idx} className="px-5 py-3 flex items-center gap-3 hover:bg-hover-bg/40 transition-colors">
              <div className="w-24 flex-shrink-0">
                <span className="text-sm font-medium text-text-primary">{d.label}</span>
              </div>

              <button
                onClick={() => toggleDia(d.idx)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                  ativo ? 'bg-emerald-500' : 'bg-elevated-solid'
                }`}
                title={ativo ? 'Atende' : 'Não atende'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    ativo ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>

              {ativo && j ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <select
                    value={horaParaStr(j.inicio)}
                    onChange={e => {
                      const h = strParaHora(e.target.value);
                      if (h !== null) atualizar(d.idx, 'inicio', h);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-page border border-border-subtle hover:border-purple-500/40 text-sm outline-none focus:border-purple-400 text-text-primary"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={horaParaStr(h)}>{horaParaStr(h)}</option>
                    ))}
                  </select>
                  <span className="text-text-faint text-xs">até</span>
                  <select
                    value={horaParaStr(j.fim)}
                    onChange={e => {
                      const h = strParaHora(e.target.value);
                      if (h !== null) atualizar(d.idx, 'fim', h);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-page border border-border-subtle hover:border-purple-500/40 text-sm outline-none focus:border-purple-400 text-text-primary"
                  >
                    {Array.from({ length: 25 }, (_, h) => (
                      <option key={h} value={horaParaStr(h)}>{horaParaStr(h)}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs text-text-faint flex-1">Não atende neste dia</span>
              )}
            </div>
          );
        })}
      </div>

      {sujo && (
        <div className="px-5 py-3 bg-purple-500/5 border-t border-purple-500/20 flex items-center justify-end gap-2">
          <button
            onClick={cancelar}
            disabled={salvando}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary border border-border-subtle rounded-lg transition-colors disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            {salvando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Salvar janelas
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Linha genérica de config ─────────────────────────────────────────────────

function ConfigRow({ config, onSave }: { config: Config; onSave: (chave: string, valor: string) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(config.valor);
  const [salvando, setSalvando] = useState(false);

  const handleSave = async () => {
    setSalvando(true);
    try {
      await onSave(config.chave, valor);
      setEditando(false);
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const cancel = () => {
    setValor(config.valor);
    setEditando(false);
  };

  // Tipo booleano: toggle inline (não usa "editando")
  if (config.tipo === 'booleano') {
    const ativo = config.valor === 'true' || config.valor === '1';
    const togglar = async () => {
      setSalvando(true);
      try {
        await onSave(config.chave, ativo ? 'false' : 'true');
      } catch {
        toast.error('Erro ao salvar.');
      } finally {
        setSalvando(false);
      }
    };
    return (
      <div className="px-5 py-3 flex items-center gap-3 hover:bg-hover-bg transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-[12px] font-mono text-purple-300">{config.chave}</code>
            <span className="text-[10px] text-text-faint uppercase tracking-wider">booleano</span>
          </div>
          {config.descricao && (
            <p className="text-[11px] text-text-muted mt-0.5">{config.descricao}</p>
          )}
        </div>
        <button
          onClick={togglar}
          disabled={salvando}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            ativo ? 'bg-emerald-500' : 'bg-elevated-solid'
          }`}
          title={ativo ? 'Desativar' : 'Ativar'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              ativo ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
          {salvando && (
            <Loader2 size={10} className="absolute right-1 top-1 animate-spin text-white" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-3 flex items-start gap-3 hover:bg-hover-bg transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-[12px] font-mono text-purple-300">{config.chave}</code>
          <span className="text-[10px] text-text-faint uppercase tracking-wider">{config.tipo}</span>
        </div>
        {config.descricao && (
          <p className="text-[11px] text-text-muted mt-0.5">{config.descricao}</p>
        )}
        <div className="mt-2">
          {editando ? (
            config.tipo === 'texto' && config.valor.length > 60 ? (
              <textarea
                value={valor}
                onChange={e => setValor(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-page border border-purple-500/40 text-sm outline-none focus:border-purple-400"
                autoFocus
              />
            ) : (
              <input
                value={valor}
                onChange={e => setValor(e.target.value)}
                type={config.tipo === 'numero' ? 'number' : 'text'}
                className="w-full px-3 py-2 rounded-lg bg-page border border-purple-500/40 text-sm outline-none focus:border-purple-400"
                autoFocus
              />
            )
          ) : (
            <div className="text-sm text-text-primary break-words">
              {config.valor === ''
                ? <em className="text-text-faint">vazio</em>
                : config.tipo === 'texto' && config.valor.length > 80
                  ? <span className="line-clamp-2">{config.valor}</span>
                  : config.valor}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 pt-1">
        {editando ? (
          <>
            <button
              onClick={handleSave}
              disabled={salvando || valor === config.valor}
              className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 disabled:opacity-50 transition-colors"
              title="Salvar"
            >
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              onClick={cancel}
              disabled={salvando}
              className="p-2 rounded-lg bg-elevated hover:bg-elevated-solid/50 text-text-muted transition-colors"
              title="Cancelar"
            >
              <XIcon size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditando(true)}
            className="p-2 rounded-lg hover:bg-elevated text-text-muted hover:text-text-primary transition-colors"
            title="Editar"
          >
            <Edit3 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
