'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Package,
  Loader2,
  RefreshCcw,
  Edit3,
  Check,
  X as XIcon,
  Star,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

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
  extraFilial: number;
  reconhecimentoFacial: boolean;
  relatoriosPdf: string;
  suporte: string;
  totemIncluso: boolean;
  totemAddonMatriz: number;
  totemAddonFilial: number;
  ordem: number;
  destaque: boolean;
  visivel: boolean;
};

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [draft, setDraft] = useState<Plano | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/saas/planos');
      setPlanos(res.data.planos || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const startEdit = (p: Plano) => {
    setDraft({ ...p });
    setEditando(p.id);
  };
  const cancelEdit = () => {
    setDraft(null);
    setEditando(null);
  };
  const saveEdit = async () => {
    if (!draft) return;
    if (!confirm('Confirma alteração?\n\nEsta mudança afeta apenas NOVAS vendas. Empresas existentes mantêm seus preços contratados (precoNegociado já cuida disso).')) return;
    setSalvando(true);
    try {
      await axios.put('/api/saas/planos', draft);
      await carregar();
      cancelEdit();
    } catch (e: any) {
      alert(e.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const toggleField = async (id: string, campo: 'destaque' | 'visivel', valor: boolean) => {
    try {
      await axios.put('/api/saas/planos', { id, [campo]: valor });
      await carregar();
    } catch {
      alert('Erro ao atualizar');
    }
  };

  return (
    <>
      <header className="sticky top-14 lg:top-0 z-10 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Package size={18} className="text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-text-primary truncate">Planos</h1>
              <p className="text-[11px] text-text-muted">Edite preços, limites e visibilidade — atualiza na landing em tempo real</p>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3 items-start">
          <AlertTriangle size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
          <div className="text-[12px] text-amber-100 space-y-1">
            <p><strong>Importante:</strong> alterações afetam apenas <strong>novas vendas</strong>. Empresas existentes continuam com seus preços contratados.</p>
            <p>A landing pode levar até 60s pra refletir a mudança (cache).</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {planos.map(p => {
              const ativo = editando === p.id;
              const d = ativo ? draft! : p;
              return (
                <div
                  key={p.id}
                  className={`bg-surface border rounded-2xl backdrop-blur overflow-hidden transition-all ${
                    ativo ? 'border-purple-500/50 shadow-lg shadow-purple-900/20' : 'border-border-subtle'
                  }`}
                >
                  {/* Header */}
                  <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint">#{p.ordem}</span>
                      {ativo ? (
                        <input
                          value={d.nome}
                          onChange={e => setDraft({ ...d, nome: e.target.value })}
                          className="bg-page border border-purple-500/40 rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-purple-400"
                        />
                      ) : (
                        <h2 className="text-base font-bold text-text-primary">{p.nome}</h2>
                      )}
                      {p.destaque && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Star size={10} /> Destaque
                        </span>
                      )}
                      {!p.visivel && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                          OCULTO
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!ativo && (
                        <>
                          <button
                            onClick={() => toggleField(p.id, 'destaque', !p.destaque)}
                            className={`p-2 rounded-lg border transition-colors ${
                              p.destaque
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-elevated border-border-subtle text-text-muted hover:text-amber-300'
                            }`}
                            title={p.destaque ? 'Remover destaque' : 'Marcar como destaque'}
                          >
                            <Star size={14} />
                          </button>
                          <button
                            onClick={() => toggleField(p.id, 'visivel', !p.visivel)}
                            className={`p-2 rounded-lg border transition-colors ${
                              p.visivel
                                ? 'bg-elevated border-border-subtle text-text-secondary hover:text-red-300'
                                : 'bg-red-500/15 border-red-500/30 text-red-300'
                            }`}
                            title={p.visivel ? 'Esconder da landing' : 'Mostrar na landing'}
                          >
                            {p.visivel ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            onClick={() => startEdit(p)}
                            className="p-2 rounded-lg bg-elevated hover:bg-elevated-solid/50 border border-border-subtle text-text-secondary hover:text-purple-300 transition-colors"
                            title="Editar"
                          >
                            <Edit3 size={14} />
                          </button>
                        </>
                      )}
                      {ativo && (
                        <>
                          <button
                            onClick={saveEdit}
                            disabled={salvando}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold disabled:opacity-50"
                          >
                            {salvando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Salvar
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={salvando}
                            className="p-2 rounded-lg bg-elevated hover:bg-elevated-solid/50 text-text-muted"
                          >
                            <XIcon size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field
                      label="Descrição"
                      ativo={ativo}
                      tipo="texto"
                      valor={d.descricao}
                      onChange={v => setDraft({ ...d, descricao: String(v) })}
                      colSpan={3}
                    />
                    <Field
                      label="Preço (R$/mês)"
                      ativo={ativo}
                      tipo="preco"
                      valor={d.preco}
                      onChange={v => setDraft({ ...d, preco: Number(v) })}
                    />
                    <Field
                      label="Máx. funcionários"
                      ativo={ativo}
                      tipo="numero"
                      valor={d.maxFuncionarios}
                      onChange={v => setDraft({ ...d, maxFuncionarios: Number(v) })}
                    />
                    <Field
                      label="Máx. admins"
                      ativo={ativo}
                      tipo="numero"
                      valor={d.maxAdmins}
                      onChange={v => setDraft({ ...d, maxAdmins: Number(v) })}
                    />
                    <Field
                      label="Máx. filiais (-1=ilim.)"
                      ativo={ativo}
                      tipo="numero"
                      valor={d.maxFiliais}
                      onChange={v => setDraft({ ...d, maxFiliais: Number(v) })}
                    />
                    <Field
                      label="Extra func. (R$)"
                      ativo={ativo}
                      tipo="preco"
                      valor={d.extraFuncionario}
                      onChange={v => setDraft({ ...d, extraFuncionario: Number(v) })}
                    />
                    <Field
                      label="Extra admin (R$)"
                      ativo={ativo}
                      tipo="preco"
                      valor={d.extraAdmin}
                      onChange={v => setDraft({ ...d, extraAdmin: Number(v) })}
                    />
                    <Field
                      label="Extra filial (R$)"
                      ativo={ativo}
                      tipo="preco"
                      valor={d.extraFilial}
                      onChange={v => setDraft({ ...d, extraFilial: Number(v) })}
                    />
                    <Field
                      label="Totem +matriz (R$)"
                      ativo={ativo}
                      tipo="preco"
                      valor={d.totemAddonMatriz}
                      onChange={v => setDraft({ ...d, totemAddonMatriz: Number(v) })}
                    />
                    <Field
                      label="Totem +filial (R$)"
                      ativo={ativo}
                      tipo="preco"
                      valor={d.totemAddonFilial}
                      onChange={v => setDraft({ ...d, totemAddonFilial: Number(v) })}
                    />
                    <FieldBoolean
                      label="Recon. facial"
                      ativo={ativo}
                      valor={d.reconhecimentoFacial}
                      onChange={v => setDraft({ ...d, reconhecimentoFacial: v })}
                    />
                    <FieldBoolean
                      label="Totem incluso"
                      ativo={ativo}
                      valor={d.totemIncluso}
                      onChange={v => setDraft({ ...d, totemIncluso: v })}
                    />
                    <FieldSelect
                      label="Relatórios PDF"
                      ativo={ativo}
                      valor={d.relatoriosPdf}
                      opcoes={[{ v: 'BASICO', l: 'Básico' }, { v: 'COMPLETO', l: 'Completo' }]}
                      onChange={v => setDraft({ ...d, relatoriosPdf: v })}
                    />
                    <FieldSelect
                      label="Suporte"
                      ativo={ativo}
                      valor={d.suporte}
                      opcoes={[
                        { v: 'EMAIL', l: 'E-mail' },
                        { v: 'WHATSAPP_EMAIL', l: 'WhatsApp + E-mail' },
                        { v: 'PRIORITARIO', l: 'Prioritário' },
                      ]}
                      onChange={v => setDraft({ ...d, suporte: v })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function Field({ label, ativo, tipo, valor, onChange, colSpan = 1 }: {
  label: string; ativo: boolean; tipo: 'texto' | 'numero' | 'preco';
  valor: any; onChange: (v: any) => void; colSpan?: number;
}) {
  const colSpanClass = colSpan === 3 ? 'col-span-2 md:col-span-3' : '';
  const valorExibido = tipo === 'preco' ? formatBRL(Number(valor)) : String(valor);
  return (
    <div className={`space-y-1 ${colSpanClass}`}>
      <label className="text-[10px] uppercase tracking-wider text-text-faint">{label}</label>
      {ativo ? (
        <input
          type={tipo === 'texto' ? 'text' : 'number'}
          step={tipo === 'preco' ? '0.01' : '1'}
          value={valor}
          onChange={e => onChange(tipo === 'texto' ? e.target.value : e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-page border border-purple-500/40 text-sm outline-none focus:border-purple-400"
        />
      ) : (
        <div className="text-sm text-text-primary">{valorExibido}</div>
      )}
    </div>
  );
}

function FieldBoolean({ label, ativo, valor, onChange }: {
  label: string; ativo: boolean; valor: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-text-faint">{label}</label>
      {ativo ? (
        <button
          onClick={() => onChange(!valor)}
          className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            valor
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-elevated border-border-subtle text-text-muted'
          }`}
        >
          {valor ? '✅ Sim' : '❌ Não'}
        </button>
      ) : (
        <div className="text-sm text-text-primary">{valor ? '✅ Sim' : '❌ Não'}</div>
      )}
    </div>
  );
}

function FieldSelect({ label, ativo, valor, opcoes, onChange }: {
  label: string; ativo: boolean; valor: string;
  opcoes: { v: string; l: string }[]; onChange: (v: string) => void;
}) {
  const op = opcoes.find(o => o.v === valor);
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-text-faint">{label}</label>
      {ativo ? (
        <select
          value={valor}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-page border border-purple-500/40 text-sm outline-none focus:border-purple-400"
        >
          {opcoes.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <div className="text-sm text-text-primary">{op?.l || valor}</div>
      )}
    </div>
  );
}
