'use client';

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  Tag,
  Loader2,
  RefreshCcw,
  Plus,
  Edit3,
  Trash2,
  Power,
  Eye,
  EyeOff,
  Calendar,
  Users,
  X,
  Save,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

type Cupom = {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'PERCENTUAL' | 'VALOR_FIXO' | 'MESES_GRATIS' | 'TRIAL_ESTENDIDO';
  valor: number;
  duracaoMeses: number;
  descricao: string | null;
  ativo: boolean;
  visivelLanding: boolean;
  destaque: string | null;
  validoDe: string | null;
  validoAte: string | null;
  maxUsos: number | null;
  usos: number;
  apenasNovos: boolean;
  apenasPlanos: string[];
  apenasCiclo: string | null;
  criadoEm: string;
};

const TIPOS = [
  { value: 'PERCENTUAL', label: '% Percentual', help: 'Ex: 50% off (informe o número de 1 a 100)' },
  { value: 'VALOR_FIXO', label: 'R$ Valor fixo', help: 'Ex: R$ 30 off (informe o valor em reais)' },
  { value: 'MESES_GRATIS', label: 'Meses grátis', help: 'Ex: 3 meses grátis após trial (informe o número de meses)' },
  { value: 'TRIAL_ESTENDIDO', label: 'Trial estendido', help: 'Ex: +30 dias de teste grátis (informe o número de dias adicionais)' },
];

const PLANOS_DISPONIVEIS = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatData(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function statusCupom(c: Cupom): { label: string; cor: string } {
  const now = new Date();
  if (!c.ativo) return { label: 'INATIVO', cor: 'bg-elevated text-text-muted border-border-subtle' };
  if (c.validoAte && new Date(c.validoAte) < now) return { label: 'EXPIRADO', cor: 'bg-red-500/15 text-red-300 border-red-500/30' };
  if (c.validoDe && new Date(c.validoDe) > now) return { label: 'AGENDADO', cor: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
  if (c.maxUsos && c.usos >= c.maxUsos) return { label: 'ESGOTADO', cor: 'bg-orange-500/15 text-orange-300 border-orange-500/30' };
  return { label: 'ATIVO', cor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
}
function descricaoTipo(c: Cupom): string {
  switch (c.tipo) {
    case 'PERCENTUAL': return `${c.valor}% off`;
    case 'VALOR_FIXO': return `${formatBRL(c.valor)} off`;
    case 'MESES_GRATIS': return `${c.valor} ${c.valor === 1 ? 'mês grátis' : 'meses grátis'}`;
    case 'TRIAL_ESTENDIDO': return `+${c.valor} dias de trial`;
  }
}
function descricaoDuracao(c: Cupom): string {
  if (c.tipo === 'TRIAL_ESTENDIDO' || c.tipo === 'MESES_GRATIS') return '';
  if (c.duracaoMeses === -1) return 'sempre';
  if (c.duracaoMeses === 1) return '1 parcela';
  return `${c.duracaoMeses} parcelas`;
}

export default function CuponsPage() {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Cupom | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/saas/cupons');
      setCupons(res.data.cupons || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const filtrados = useMemo(() => {
    if (filtro === 'ativos') return cupons.filter(c => c.ativo);
    if (filtro === 'inativos') return cupons.filter(c => !c.ativo);
    return cupons;
  }, [cupons, filtro]);

  const toggleAtivo = async (c: Cupom) => {
    try {
      await axios.put(`/api/saas/cupons/${c.id}`, { ativo: !c.ativo });
      await carregar();
    } catch {
      alert('Erro ao alterar status.');
    }
  };

  const toggleVisivel = async (c: Cupom) => {
    try {
      await axios.put(`/api/saas/cupons/${c.id}`, { visivelLanding: !c.visivelLanding });
      await carregar();
    } catch {
      alert('Erro ao alterar visibilidade.');
    }
  };

  const excluir = async (c: Cupom) => {
    const confirma = c.usos > 0
      ? confirm(`O cupom ${c.codigo} já foi usado ${c.usos}× e será DESATIVADO (não excluído de fato pra preservar histórico). Confirma?`)
      : confirm(`Excluir cupom ${c.codigo}?`);
    if (!confirma) return;
    try {
      await axios.delete(`/api/saas/cupons/${c.id}`);
      await carregar();
    } catch {
      alert('Erro ao excluir.');
    }
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 1500);
  };

  return (
    <>
      <header className="sticky top-14 lg:top-0 z-10 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center">
              <Tag size={18} className="text-fuchsia-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-text-primary truncate">Cupons</h1>
              <p className="text-[11px] text-text-muted">Crie, ligue/desligue e configure descontos personalizados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={carregar}
              disabled={loading}
              className="flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-secondary px-3 py-2 rounded-xl border border-border-subtle text-xs sm:text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => { setEditando(null); setModalOpen(true); }}
              className="flex items-center gap-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow shadow-fuchsia-600/20"
            >
              <Plus size={14} />
              <span>Novo cupom</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Filtros */}
        <div className="flex gap-2">
          {(['todos', 'ativos', 'inativos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                filtro === f
                  ? 'text-fuchsia-300 bg-hover-bg border-fuchsia-400'
                  : 'text-text-faint border-border-subtle hover:text-text-secondary'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'ativos' ? 'Ativos' : 'Inativos'}
              <span className="ml-1.5 text-[10px] text-text-faint">
                ({f === 'todos' ? cupons.length : f === 'ativos' ? cupons.filter(c => c.ativo).length : cupons.filter(c => !c.ativo).length})
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-purple-400" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20 text-text-muted text-sm">
            <Tag size={32} className="mx-auto mb-3 text-text-faint" />
            <p>Nenhum cupom {filtro === 'todos' ? 'cadastrado ainda' : filtro}.</p>
            {filtro === 'todos' && (
              <button
                onClick={() => { setEditando(null); setModalOpen(true); }}
                className="mt-4 text-fuchsia-300 hover:text-fuchsia-200 text-sm font-medium underline"
              >
                Criar o primeiro cupom
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map(c => {
              const status = statusCupom(c);
              return (
                <div
                  key={c.id}
                  className="bg-surface border border-border-subtle rounded-2xl p-4 backdrop-blur hover:border-border-default transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => copiarCodigo(c.codigo)}
                          className="font-mono font-bold text-sm text-fuchsia-300 bg-fuchsia-500/10 px-2.5 py-1 rounded border border-fuchsia-500/30 hover:bg-fuchsia-500/20 transition-colors flex items-center gap-1.5"
                          title="Clique para copiar"
                        >
                          {c.codigo}
                          {copiado === c.codigo ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${status.cor}`}>
                          {status.label}
                        </span>
                        {c.visivelLanding && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30 text-blue-300 bg-blue-500/10 flex items-center gap-1">
                            <Eye size={10} /> Landing
                          </span>
                        )}
                        {c.destaque && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30 text-amber-300 bg-amber-500/10">
                            🔥 {c.destaque}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-text-primary mt-2">{c.nome}</h3>
                      {c.descricao && <p className="text-xs text-text-muted mt-0.5">{c.descricao}</p>}

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-secondary">
                        <span className="flex items-center gap-1.5">
                          💰 <strong className="text-emerald-300">{descricaoTipo(c)}</strong>
                          {descricaoDuracao(c) && <span className="text-text-faint">({descricaoDuracao(c)})</span>}
                        </span>
                        {(c.validoDe || c.validoAte) && (
                          <span className="flex items-center gap-1 text-text-muted">
                            <Calendar size={11} />
                            {formatData(c.validoDe)} → {formatData(c.validoAte)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-text-muted">
                          <Users size={11} />
                          {c.usos}{c.maxUsos ? `/${c.maxUsos}` : ''} usos
                        </span>
                        {c.apenasPlanos.length > 0 && (
                          <span className="text-text-faint">só {c.apenasPlanos.join(', ')}</span>
                        )}
                        {c.apenasCiclo && (
                          <span className="text-text-faint">só {c.apenasCiclo === 'YEARLY' ? 'anual' : 'mensal'}</span>
                        )}
                        {c.apenasNovos && <span className="text-text-faint">só novos clientes</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => toggleAtivo(c)}
                        className={`p-2 rounded-lg border transition-colors ${
                          c.ativo
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-elevated border-border-subtle text-text-muted hover:text-emerald-300'
                        }`}
                        title={c.ativo ? 'Desligar cupom' : 'Ligar cupom'}
                      >
                        <Power size={14} />
                      </button>
                      <button
                        onClick={() => toggleVisivel(c)}
                        className={`p-2 rounded-lg border transition-colors ${
                          c.visivelLanding
                            ? 'bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25'
                            : 'bg-elevated border-border-subtle text-text-muted hover:text-blue-300'
                        }`}
                        title={c.visivelLanding ? 'Ocultar da landing' : 'Mostrar na landing'}
                      >
                        {c.visivelLanding ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        onClick={() => { setEditando(c); setModalOpen(true); }}
                        className="p-2 rounded-lg bg-elevated hover:bg-elevated-solid/50 border border-border-subtle text-text-secondary hover:text-purple-300 transition-colors"
                        title="Editar"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => excluir(c)}
                        className="p-2 rounded-lg bg-elevated hover:bg-red-500/20 border border-border-subtle text-text-muted hover:text-red-300 hover:border-red-500/30 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {modalOpen && (
        <CupomModal
          inicial={editando}
          onClose={() => { setModalOpen(false); setEditando(null); }}
          onSaved={() => { setModalOpen(false); setEditando(null); carregar(); }}
        />
      )}
    </>
  );
}

function CupomModal({ inicial, onClose, onSaved }: {
  inicial: Cupom | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const novo = !inicial;
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [codigo, setCodigo] = useState(inicial?.codigo || '');
  const [nome, setNome] = useState(inicial?.nome || '');
  const [tipo, setTipo] = useState<Cupom['tipo']>(inicial?.tipo || 'PERCENTUAL');
  const [valor, setValor] = useState(inicial?.valor != null ? String(inicial.valor) : '');
  const [duracaoMeses, setDuracaoMeses] = useState(inicial?.duracaoMeses != null ? String(inicial.duracaoMeses) : '1');
  const [descricao, setDescricao] = useState(inicial?.descricao || '');
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [visivelLanding, setVisivelLanding] = useState(inicial?.visivelLanding ?? false);
  const [destaque, setDestaque] = useState(inicial?.destaque || '');
  const [validoDe, setValidoDe] = useState(inicial?.validoDe ? inicial.validoDe.slice(0, 10) : '');
  const [validoAte, setValidoAte] = useState(inicial?.validoAte ? inicial.validoAte.slice(0, 10) : '');
  const [maxUsos, setMaxUsos] = useState(inicial?.maxUsos != null ? String(inicial.maxUsos) : '');
  const [apenasNovos, setApenasNovos] = useState(inicial?.apenasNovos ?? false);
  const [apenasPlanos, setApenasPlanos] = useState<string[]>(inicial?.apenasPlanos || []);
  const [apenasCiclo, setApenasCiclo] = useState<'' | 'MONTHLY' | 'YEARLY'>(
    (inicial?.apenasCiclo as any) || ''
  );

  const tipoMeta = TIPOS.find(t => t.value === tipo);
  const semDuracao = tipo === 'MESES_GRATIS' || tipo === 'TRIAL_ESTENDIDO';

  const togglePlano = (p: string) => {
    setApenasPlanos(arr => arr.includes(p) ? arr.filter(x => x !== p) : [...arr, p]);
  };

  const handleSave = async () => {
    setErro(null);
    setSalvando(true);
    try {
      const payload: any = {
        nome,
        tipo,
        valor: Number(valor),
        duracaoMeses: semDuracao ? 1 : Number(duracaoMeses),
        descricao: descricao || null,
        ativo,
        visivelLanding,
        destaque: destaque || null,
        validoDe: validoDe || null,
        validoAte: validoAte || null,
        maxUsos: maxUsos ? Number(maxUsos) : null,
        apenasNovos,
        apenasPlanos,
        apenasCiclo: apenasCiclo || null,
      };
      if (novo) {
        payload.codigo = codigo;
        await axios.post('/api/saas/cupons', payload);
      } else {
        await axios.put(`/api/saas/cupons/${inicial!.id}`, payload);
      }
      onSaved();
    } catch (e: any) {
      setErro(e.response?.data?.mensagem || e.response?.data?.erro || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center px-4 py-6 overflow-y-auto bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl bg-page border border-border-default rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Tag size={16} className="text-fuchsia-300" />
            {novo ? 'Novo cupom' : `Editar ${inicial?.codigo}`}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-elevated rounded-lg text-text-muted">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-200 flex gap-2 items-start">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              {erro}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código (URL-friendly)</Label>
              <input
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                disabled={!novo}
                placeholder="DIATRABALHADOR"
                className="w-full px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm font-mono outline-none focus:border-purple-400 disabled:opacity-50"
              />
              {novo && <span className="text-[10px] text-text-faint mt-1">3-30 caracteres. A-Z, 0-9, _ ou -</span>}
            </div>
            <div>
              <Label>Nome interno</Label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Dia do Trabalhador"
                className="w-full px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div>
            <Label>Descrição (mostrada ao cliente)</Label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={2}
              placeholder="50% de desconto nas 3 primeiras parcelas para celebrar o dia do trabalhador"
              className="w-full px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm outline-none focus:border-purple-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm outline-none focus:border-purple-400"
              >
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {tipoMeta && <span className="text-[10px] text-text-faint mt-1 block">{tipoMeta.help}</span>}
            </div>
            <div>
              <Label>{tipo === 'PERCENTUAL' ? 'Percentual (1-100)' : tipo === 'VALOR_FIXO' ? 'Valor (R$)' : tipo === 'MESES_GRATIS' ? 'Meses grátis' : 'Dias adicionais'}</Label>
              <input
                type="number"
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="50"
                step={tipo === 'VALOR_FIXO' ? '0.01' : '1'}
                className="w-full px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {!semDuracao && (
            <div>
              <Label>Duração (em quantas parcelas o desconto vale?)</Label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={duracaoMeses}
                  onChange={e => setDuracaoMeses(e.target.value)}
                  placeholder="3"
                  min="-1"
                  className="flex-1 px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm outline-none focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={() => setDuracaoMeses('-1')}
                  className="px-3 py-2 rounded-lg bg-elevated hover:bg-elevated-solid/50 border border-border-subtle text-xs text-text-secondary"
                >
                  Sempre
                </button>
              </div>
              <span className="text-[10px] text-text-faint mt-1 block">
                Ex: 1 = só 1ª parcela. 3 = 3 primeiras. -1 ou "Sempre" = enquanto durar a assinatura.
              </span>
            </div>
          )}

          <div className="border-t border-border-subtle pt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-text-faint tracking-wider">Visibilidade</h3>

            <div className="grid grid-cols-2 gap-3">
              <Toggle label="Ativo" valor={ativo} onChange={setAtivo} hint="Pode ser usado em checkout" />
              <Toggle label="Mostrar na landing" valor={visivelLanding} onChange={setVisivelLanding} hint="Aparece como banner no site" />
            </div>

            {visivelLanding && (
              <div>
                <Label>Texto-destaque (badge na landing — opcional)</Label>
                <input
                  value={destaque}
                  onChange={e => setDestaque(e.target.value)}
                  placeholder="DIA DO TRABALHADOR"
                  maxLength={30}
                  className="w-full px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm outline-none focus:border-purple-400"
                />
              </div>
            )}
          </div>

          <div className="border-t border-border-subtle pt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-text-faint tracking-wider">Validade & limites</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Válido a partir de</Label>
                <input
                  type="date"
                  value={validoDe}
                  onChange={e => setValidoDe(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <Label>Válido até</Label>
                <input
                  type="date"
                  value={validoAte}
                  onChange={e => setValidoAte(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <Label>Máx. usos (vazio = ∞)</Label>
                <input
                  type="number"
                  value={maxUsos}
                  onChange={e => setMaxUsos(e.target.value)}
                  placeholder="100"
                  className="w-full px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm outline-none focus:border-purple-400"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border-subtle pt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-text-faint tracking-wider">Restrições</h3>

            <Toggle label="Apenas para novos clientes" valor={apenasNovos} onChange={setApenasNovos} hint="Empresas existentes não podem usar" />

            <div>
              <Label>Apenas estes planos (vazio = todos)</Label>
              <div className="flex gap-2 flex-wrap">
                {PLANOS_DISPONIVEIS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlano(p)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      apenasPlanos.includes(p)
                        ? 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300'
                        : 'bg-elevated border-border-subtle text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Apenas ciclo</Label>
              <select
                value={apenasCiclo}
                onChange={e => setApenasCiclo(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm outline-none focus:border-purple-400"
              >
                <option value="">Todos os ciclos</option>
                <option value="MONTHLY">Apenas mensal</option>
                <option value="YEARLY">Apenas anual</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2 rounded-lg bg-elevated hover:bg-elevated-solid/50 border border-border-subtle text-sm text-text-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={salvando || !codigo || !nome || !valor}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-bold disabled:opacity-50"
          >
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {novo ? 'Criar cupom' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] uppercase tracking-wider text-text-faint mb-1">{children}</label>;
}

function Toggle({ label, valor, onChange, hint }: {
  label: string;
  valor: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!valor)}
      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
        valor
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          : 'bg-elevated border-border-subtle text-text-secondary hover:border-border-default'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-xs ${valor ? 'text-emerald-300' : 'text-text-faint'}`}>{valor ? 'Sim' : 'Não'}</span>
      </div>
      {hint && <p className="text-[10px] text-text-faint mt-0.5">{hint}</p>}
    </button>
  );
}
