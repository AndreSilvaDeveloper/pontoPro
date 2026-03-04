'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ArrowLeft, Save, Plus, Trash2, ShieldCheck, Database,
  CreditCard, Settings, AlertTriangle, Users, Building2,
  Calendar, DollarSign, Eye, EyeOff, Lock, Unlock, Check
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { PLANOS, type PlanoId } from '@/config/planos';

type Tab = 'visao' | 'plano' | 'configs' | 'acoes';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'visao', label: 'Visão Geral', icon: <Eye size={16} /> },
  { key: 'plano', label: 'Plano e Cobrança', icon: <CreditCard size={16} /> },
  { key: 'configs', label: 'Configurações', icon: <Settings size={16} /> },
  { key: 'acoes', label: 'Ações', icon: <AlertTriangle size={16} /> },
];

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toISODate(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ATIVO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    BLOQUEADO: 'bg-red-500/20 text-red-400 border-red-500/30',
    TRIAL: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-border-input text-text-secondary border-border-input'}`}>
      {status}
    </span>
  );
}

function PlanoBadge({ plano }: { plano: string }) {
  const map: Record<string, string> = {
    STARTER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PROFESSIONAL: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    ENTERPRISE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[plano] || 'bg-border-input text-text-secondary border-border-input'}`}>
      {PLANOS[plano as PlanoId]?.nome || plano}
    </span>
  );
}

const METODO_LABELS: Record<string, string> = {
  UNDEFINED: 'PIX / Boleto',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de Crédito',
};

const CICLO_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
};

function formatMetodo(m: string | null | undefined) {
  const key = m || 'UNDEFINED';
  return METODO_LABELS[key] || key;
}

function formatCiclo(c: string | null | undefined) {
  const key = c || 'MONTHLY';
  return CICLO_LABELS[key] || key;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface border border-border-subtle rounded-2xl p-5 ${className}`}>{children}</div>;
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-purple-600' : 'bg-border-input'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export default function ConfigEmpresaPage() {
  const router = useRouter();
  const params = useParams();
  const idEmpresa = params.id as string;

  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('visao');
  const [busy, setBusy] = useState<string | null>(null);

  // Tab Plano & Cobrança
  const [planoSel, setPlanoSel] = useState('');
  const [cycleSel, setCycleSel] = useState('MONTHLY');
  const [diaVencimento, setDiaVencimento] = useState(15);
  const [chavePix, setChavePix] = useState('');
  const [cobrancaWhatsapp, setCobrancaWhatsapp] = useState('');
  const [cobrancaAtiva, setCobrancaAtiva] = useState(false);
  const [trialAte, setTrialAte] = useState('');
  const [pagoAte, setPagoAte] = useState('');
  const [billingAnchor, setBillingAnchor] = useState('');

  // Tab Configurações
  const [padrao, setPadrao] = useState({
    bloquearForaDoRaio: true,
    exigirFoto: true,
    ocultarSaldoHoras: false,
    permitirEdicaoFunc: false,
  });
  const [intervaloPago, setIntervaloPago] = useState(false);
  const [fluxoEstrito, setFluxoEstrito] = useState(true);
  const [custom, setCustom] = useState<{ chave: string; valor: string }[]>([]);
  const [novaChave, setNovaChave] = useState('');
  const [novoValor, setNovoValor] = useState('');

  // Tab Ações
  const [matrizAlvoId, setMatrizAlvoId] = useState('');
  const [matrizes, setMatrizes] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState('');

  useEffect(() => {
    if (idEmpresa) carregar();
  }, [idEmpresa]);

  const carregar = async () => {
    try {
      const res = await axios.get(`/api/saas/empresa/${idEmpresa}`);
      const emp = res.data.empresa || res.data;
      setEmpresa(emp);

      // Plano
      setPlanoSel(emp.plano || 'PROFESSIONAL');
      setCycleSel(emp.billingCycle || 'MONTHLY');
      setDiaVencimento(emp.diaVencimento ?? 15);
      setChavePix(emp.chavePix || '');
      setCobrancaWhatsapp(emp.cobrancaWhatsapp || '');
      setCobrancaAtiva(!!emp.cobrancaAtiva);
      setTrialAte(toISODate(emp.trialAte));
      setPagoAte(toISODate(emp.pagoAte));
      setBillingAnchor(toISODate(emp.billingAnchorAt));

      // Configs
      const cfg = emp.configuracoes || {};
      const { bloquearForaDoRaio, exigirFoto, ocultarSaldoHoras, permitirEdicaoFunc, ...restante } = cfg;
      setPadrao({
        bloquearForaDoRaio: !!bloquearForaDoRaio,
        exigirFoto: !!exigirFoto,
        ocultarSaldoHoras: !!ocultarSaldoHoras,
        permitirEdicaoFunc: !!permitirEdicaoFunc,
      });
      setIntervaloPago(!!emp.intervaloPago);
      setFluxoEstrito(emp.fluxoEstrito !== false);
      setCustom(Object.entries(restante).map(([k, v]) => ({ chave: k, valor: String(v) })));
    } catch {
      alert('Erro ao carregar empresa');
    } finally {
      setLoading(false);
    }
  };

  const carregarMatrizes = async () => {
    try {
      const res = await axios.post('/api/saas/gestao');
      const all = res.data || [];
      setMatrizes(all.filter((e: any) => e.id !== idEmpresa));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (activeTab === 'acoes') carregarMatrizes();
  }, [activeTab]);

  // === Ações Tab Visão Geral ===
  const confirmarPagamento = async (meses: number) => {
    setBusy(`pay-${meses}`);
    try {
      await axios.put('/api/saas/confirmar-pagamento', { empresaId: idEmpresa, meses, limparTrial: true });
      await carregar();
    } catch { alert('Erro ao confirmar pagamento'); }
    finally { setBusy(null); }
  };

  const toggleBloqueio = async (bloquear: boolean) => {
    setBusy(bloquear ? 'bloq' : 'unbloq');
    try {
      await axios.put('/api/saas/toggle-bloqueio', { empresaId: idEmpresa, bloquear });
      await carregar();
    } catch { alert('Erro ao alterar status'); }
    finally { setBusy(null); }
  };

  // === Salvar Tab Plano ===
  const salvarPlano = async () => {
    setBusy('plano');
    try {
      // Campos via API empresa
      await axios.put(`/api/saas/empresa/${idEmpresa}`, {
        plano: planoSel,
        billingCycle: cycleSel,
      });
      // Campos financeiros via atualizar-financeiro
      await axios.put('/api/saas/atualizar-financeiro', {
        empresaId: idEmpresa,
        diaVencimento,
        chavePix,
        cobrancaWhatsapp,
        cobrancaAtiva,
        trialAteISO: trialAte || null,
        pagoAteISO: pagoAte || null,
        billingAnchorAtISO: billingAnchor || null,
      });
      await carregar();
      alert('Plano e cobrança salvos!');
    } catch { alert('Erro ao salvar plano'); }
    finally { setBusy(null); }
  };

  // === Salvar Tab Configs ===
  const salvarConfigs = async () => {
    setBusy('configs');
    try {
      const jsonFinal: any = { ...padrao };
      custom.forEach(item => {
        let val: any = item.valor;
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (!isNaN(Number(val)) && val !== '') val = Number(val);
        jsonFinal[item.chave] = val;
      });
      await axios.put(`/api/saas/empresa/${idEmpresa}`, {
        novasConfigs: jsonFinal,
        intervaloPago,
        fluxoEstrito,
      });
      await carregar();
      alert('Configurações salvas!');
    } catch { alert('Erro ao salvar configs'); }
    finally { setBusy(null); }
  };

  // === Ações Tab Ações ===
  const vincularMatriz = async () => {
    if (!matrizAlvoId) return;
    setBusy('vincular');
    try {
      await axios.put('/api/saas/gestao', {
        empresaId: idEmpresa,
        acao: 'VINCULAR_MATRIZ',
        matrizId: matrizAlvoId,
      });
      await carregar();
      alert('Empresa vinculada como filial!');
    } catch { alert('Erro ao vincular'); }
    finally { setBusy(null); }
  };

  const excluirEmpresa = async () => {
    if (confirmDelete !== 'DELETAR') return;
    setBusy('excluir');
    try {
      await axios.delete('/api/saas/excluir-empresa', { data: { id: idEmpresa } });
      alert('Empresa excluída!');
      router.push('/saas');
    } catch { alert('Erro ao excluir empresa'); }
    finally { setBusy(null); }
  };

  // === Custom key-value helpers ===
  const addCustom = () => {
    if (!novaChave || !novoValor) return;
    setCustom([...custom, { chave: novaChave, valor: novoValor }]);
    setNovaChave(''); setNovoValor('');
  };
  const removeCustom = (i: number) => setCustom(custom.filter((_, idx) => idx !== i));

  if (loading) return (
    <div className="min-h-screen bg-page text-text-primary flex items-center justify-center">
      <div className="animate-pulse text-text-muted">Carregando...</div>
    </div>
  );

  const planoConfig = PLANOS[empresa?.plano as PlanoId] || PLANOS.PROFESSIONAL;

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* === HEADER === */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-text-primary">{empresa?.nome}</h1>
              <StatusBadge status={empresa?.status} />
              <PlanoBadge plano={empresa?.plano} />
            </div>
            <div className="flex items-center gap-3 text-sm text-text-muted flex-wrap">
              {empresa?.cnpj && <span>CNPJ: {empresa.cnpj}</span>}
              <span className="flex items-center gap-1"><Users size={14} /> {empresa?._count?.usuarios || 0} funcionários</span>
              <span className="flex items-center gap-1"><ShieldCheck size={14} /> {empresa?.usuarios?.length || 0} admins</span>
            </div>
          </div>
          <Link
            href="/saas"
            className="flex items-center gap-2 bg-elevated/80 hover:bg-elevated-solid px-4 py-2.5 rounded-xl text-sm border border-border-subtle transition-colors shrink-0"
          >
            <ArrowLeft size={16} /> Voltar ao Painel
          </Link>
        </div>

        {/* === TABS === */}
        <div className="border-b border-border-default flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab.key
                  ? 'border-purple-500 text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* === TAB CONTENT === */}

        {/* ─── VISÃO GERAL ─── */}
        {activeTab === 'visao' && (
          <div className="space-y-5">
            {/* Resumo Financeiro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <p className="text-xs text-text-muted mb-1">Plano Atual</p>
                <p className="text-lg font-bold">{planoConfig.nome}</p>
                <p className="text-sm text-text-muted">R$ {planoConfig.preco.toFixed(2)}/mês</p>
              </Card>
              <Card>
                <p className="text-xs text-text-muted mb-1">Método de Pagamento</p>
                <p className="text-lg font-bold">{formatMetodo(empresa?.billingMethod)}</p>
                <p className="text-sm text-text-muted">Ciclo: {formatCiclo(empresa?.billingCycle)}</p>
              </Card>
              <Card>
                <p className="text-xs text-text-muted mb-1">Pago Até</p>
                <p className="text-lg font-bold">{formatDate(empresa?.pagoAte)}</p>
                <p className="text-sm text-text-muted">Venc. dia {empresa?.diaVencimento || 15}</p>
              </Card>
              <Card>
                <p className="text-xs text-text-muted mb-1">Cobrança</p>
                <p className={`text-lg font-bold ${empresa?.cobrancaAtiva ? 'text-emerald-400' : 'text-red-400'}`}>
                  {empresa?.cobrancaAtiva ? 'ATIVA' : 'DESATIVADA'}
                </p>
                <p className="text-sm text-text-muted">Último pag: {formatDate(empresa?.dataUltimoPagamento)}</p>
              </Card>
            </div>

            {/* Datas Importantes */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2"><Calendar size={16} /> Datas Importantes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-text-faint text-xs">Criado em</p>
                  <p className="text-text-primary">{formatDate(empresa?.criadoEm)}</p>
                </div>
                <div>
                  <p className="text-text-faint text-xs">Trial até</p>
                  <p className="text-text-primary">{formatDate(empresa?.trialAte)}</p>
                </div>
                <div>
                  <p className="text-text-faint text-xs">Pago até</p>
                  <p className="text-text-primary">{formatDate(empresa?.pagoAte)}</p>
                </div>
                <div>
                  <p className="text-text-faint text-xs">Último pagamento</p>
                  <p className="text-text-primary">{formatDateTime(empresa?.dataUltimoPagamento)}</p>
                </div>
                <div>
                  <p className="text-text-faint text-xs">Billing Anchor</p>
                  <p className="text-text-primary">{formatDate(empresa?.billingAnchorAt)}</p>
                </div>
              </div>
            </Card>

            {/* Filiais */}
            {empresa?.filiais?.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2"><Building2 size={16} /> Filiais ({empresa.filiais.length})</h3>
                <div className="space-y-2">
                  {empresa.filiais.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between bg-elevated rounded-xl px-4 py-2.5 border border-border-subtle">
                      <div>
                        <p className="text-sm font-medium">{f.nome}</p>
                        <p className="text-xs text-text-muted">{f.cnpj || 'Sem CNPJ'} &middot; {f._count?.usuarios || 0} usuários</p>
                      </div>
                      <StatusBadge status={f.status} />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Ações Rápidas */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Ações Rápidas</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => confirmarPagamento(1)}
                  disabled={!!busy}
                  className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {busy === 'pay-1' ? 'Confirmando...' : <span className="flex items-center gap-2"><Check size={16} /> Confirmar pagamento (1 mês)</span>}
                </button>
                <button
                  onClick={() => confirmarPagamento(3)}
                  disabled={!!busy}
                  className="bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {busy === 'pay-3' ? 'Confirmando...' : <span className="flex items-center gap-2"><Check size={16} /> Confirmar pagamento (3 meses)</span>}
                </button>
                {empresa?.status !== 'BLOQUEADO' ? (
                  <button
                    onClick={() => toggleBloqueio(true)}
                    disabled={!!busy}
                    className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {busy === 'bloq' ? 'Bloqueando...' : <span className="flex items-center gap-2"><Lock size={16} /> Bloquear manualmente</span>}
                  </button>
                ) : (
                  <button
                    onClick={() => toggleBloqueio(false)}
                    disabled={!!busy}
                    className="bg-border-input/50 hover:bg-elevated-solid border border-border-default text-text-secondary px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {busy === 'unbloq' ? 'Desbloqueando...' : <span className="flex items-center gap-2"><Unlock size={16} /> Desbloquear manualmente</span>}
                  </button>
                )}
              </div>
              <p className="text-xs text-text-faint mt-3">
                &quot;Confirmar pagamento&quot; libera e seta pagoAte + dataUltimoPagamento + status ATIVO.
              </p>
            </Card>
          </div>
        )}

        {/* ─── PLANO E COBRANÇA ─── */}
        {activeTab === 'plano' && (
          <div className="space-y-5">
            {/* Seletor de Plano */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-4">Plano</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.keys(PLANOS) as PlanoId[]).map(pid => {
                  const p = PLANOS[pid];
                  const selected = planoSel === pid;
                  return (
                    <button
                      key={pid}
                      onClick={() => setPlanoSel(pid)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        selected
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-border-subtle bg-elevated hover:border-white/20'
                      }`}
                    >
                      <p className="font-bold text-text-primary">{p.nome}</p>
                      <p className="text-xs text-text-muted mt-0.5">{p.descricao}</p>
                      <p className="text-lg font-bold text-purple-400 mt-2">R$ {p.preco.toFixed(2)}<span className="text-xs text-text-muted font-normal">/mês</span></p>
                      <div className="text-xs text-text-faint mt-1">
                        {p.maxFuncionarios} func &middot; {p.maxAdmins} admin &middot; {p.maxFiliais < 0 ? '∞' : p.maxFiliais} filiais
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Ciclo */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Ciclo de Cobrança</h3>
              <div className="flex gap-3">
                {['MONTHLY', 'YEARLY'].map(c => (
                  <button
                    key={c}
                    onClick={() => setCycleSel(c)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      cycleSel === c
                        ? 'border-purple-500 bg-purple-500/10 text-text-primary'
                        : 'border-border-subtle bg-elevated text-text-muted hover:border-white/20'
                    }`}
                  >
                    {c === 'MONTHLY' ? 'Mensal' : 'Anual (10% desc.)'}
                  </button>
                ))}
              </div>
            </Card>

            {/* Método de Pagamento (badge) */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Método de Pagamento</h3>
              <span className="px-3 py-1.5 bg-elevated-solid rounded-lg text-sm font-semibold border border-border-subtle">
                {formatMetodo(empresa?.billingMethod)}
              </span>
            </Card>

            {/* Config Financeira */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2"><DollarSign size={16} /> Configuração Financeira</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Dia do Vencimento</label>
                  <select
                    value={diaVencimento}
                    onChange={e => setDiaVencimento(Number(e.target.value))}
                    className="w-full bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Chave PIX Recebedora</label>
                  <input
                    value={chavePix}
                    onChange={e => setChavePix(e.target.value)}
                    className="w-full bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary"
                    placeholder="CPF, CNPJ, email ou chave aleatória"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">WhatsApp Cobrança</label>
                  <input
                    value={cobrancaWhatsapp}
                    onChange={e => setCobrancaWhatsapp(e.target.value)}
                    className="w-full bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary"
                    placeholder="5532999999999"
                  />
                </div>
                <div className="flex items-center justify-between bg-elevated/30 rounded-xl px-4 py-3 border border-border-subtle">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Cobrança Ativa</p>
                    <p className="text-xs text-text-faint">Habilita cobrança automática</p>
                  </div>
                  <Toggle checked={cobrancaAtiva} onChange={() => setCobrancaAtiva(!cobrancaAtiva)} />
                </div>
              </div>
            </Card>

            {/* Datas Editáveis */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2"><Calendar size={16} /> Datas (Avançado)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Trial até</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={trialAte}
                      onChange={e => setTrialAte(e.target.value)}
                      className="flex-1 bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary"
                    />
                    {trialAte && (
                      <button onClick={() => setTrialAte('')} className="text-red-400 hover:text-red-300 text-xs px-2">Limpar</button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Pago até</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={pagoAte}
                      onChange={e => setPagoAte(e.target.value)}
                      className="flex-1 bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary"
                    />
                    {pagoAte && (
                      <button onClick={() => setPagoAte('')} className="text-red-400 hover:text-red-300 text-xs px-2">Limpar</button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Billing Anchor</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={billingAnchor}
                      onChange={e => setBillingAnchor(e.target.value)}
                      className="flex-1 bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary"
                    />
                    {billingAnchor && (
                      <button onClick={() => setBillingAnchor('')} className="text-red-400 hover:text-red-300 text-xs px-2">Limpar</button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <button
              onClick={salvarPlano}
              disabled={!!busy}
              className="w-full bg-purple-600 hover:bg-purple-700 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 transition-colors disabled:opacity-50"
            >
              {busy === 'plano' ? 'Salvando...' : <><Save size={18} /> Salvar Plano e Cobrança</>}
            </button>
          </div>
        )}

        {/* ─── CONFIGURAÇÕES DO SISTEMA ─── */}
        {activeTab === 'configs' && (
          <div className="space-y-5">
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2"><ShieldCheck size={16} /> Padrões do Sistema</h3>
              <div className="space-y-3">
                {[
                  { key: 'bloquearForaDoRaio' as const, label: 'Bloqueio de GPS', desc: 'Impede ponto fora do raio permitido' },
                  { key: 'exigirFoto' as const, label: 'Exigir Foto', desc: 'Obrigatório selfie ao bater ponto' },
                  { key: 'ocultarSaldoHoras' as const, label: 'Ocultar Saldo de Horas', desc: 'Funcionário não vê banco de horas' },
                  { key: 'permitirEdicaoFunc' as const, label: 'Permitir Edição Funcionário', desc: 'Funcionário pode editar seus dados' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between bg-elevated/30 rounded-xl px-4 py-3.5 border border-border-subtle">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{item.label}</p>
                      <p className="text-xs text-text-faint">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={padrao[item.key]}
                      onChange={() => setPadrao(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    />
                  </div>
                ))}

                {/* Toggles de campos diretos da empresa */}
                <div className="flex items-center justify-between bg-elevated/30 rounded-xl px-4 py-3.5 border border-border-subtle">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Intervalo Pago</p>
                    <p className="text-xs text-text-faint">Intervalo conta como hora trabalhada</p>
                  </div>
                  <Toggle checked={intervaloPago} onChange={() => setIntervaloPago(!intervaloPago)} />
                </div>
                <div className="flex items-center justify-between bg-elevated/30 rounded-xl px-4 py-3.5 border border-border-subtle">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Fluxo Estrito</p>
                    <p className="text-xs text-text-faint">Ordem rígida entrada → intervalo → retorno → saída</p>
                  </div>
                  <Toggle checked={fluxoEstrito} onChange={() => setFluxoEstrito(!fluxoEstrito)} />
                </div>
              </div>
            </Card>

            {/* Custom key-value */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2"><Database size={16} /> Personalização Extra</h3>
              <div className="space-y-2">
                {custom.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-elevated/30 rounded-xl px-4 py-2.5 border border-border-subtle">
                    <span className="font-mono text-purple-400 text-sm flex-1 truncate">{item.chave}</span>
                    <span className="text-text-muted">=</span>
                    <span className="font-mono text-text-primary text-sm flex-1 truncate">{item.valor}</span>
                    <button onClick={() => removeCustom(idx)} className="text-red-500 hover:text-red-400 shrink-0"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  placeholder="Chave (ex: limite_usuarios)"
                  value={novaChave}
                  onChange={e => setNovaChave(e.target.value)}
                  className="flex-1 bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-slate-600"
                />
                <input
                  placeholder="Valor (ex: 10)"
                  value={novoValor}
                  onChange={e => setNovoValor(e.target.value)}
                  className="flex-1 bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-slate-600"
                />
                <button onClick={addCustom} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-xl font-bold transition-colors shrink-0">
                  <Plus size={18} />
                </button>
              </div>
            </Card>

            <button
              onClick={salvarConfigs}
              disabled={!!busy}
              className="w-full bg-purple-600 hover:bg-purple-700 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 transition-colors disabled:opacity-50"
            >
              {busy === 'configs' ? 'Salvando...' : <><Save size={18} /> Salvar Configurações</>}
            </button>
          </div>
        )}

        {/* ─── AÇÕES ─── */}
        {activeTab === 'acoes' && (
          <div className="space-y-5">
            {/* Vincular como filial */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2"><Building2 size={16} /> Vincular como Filial</h3>
              <p className="text-xs text-text-faint mb-3">Selecione a empresa matriz para vincular esta empresa como filial.</p>
              <div className="flex gap-3">
                <select
                  value={matrizAlvoId}
                  onChange={e => setMatrizAlvoId(e.target.value)}
                  className="flex-1 bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary"
                >
                  <option value="">Selecione a matriz...</option>
                  {matrizes.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nome} {m.cnpj ? `(${m.cnpj})` : ''}</option>
                  ))}
                </select>
                <button
                  onClick={vincularMatriz}
                  disabled={!matrizAlvoId || !!busy}
                  className="bg-purple-600 hover:bg-purple-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {busy === 'vincular' ? 'Vinculando...' : 'Vincular'}
                </button>
              </div>
            </Card>

            {/* Excluir empresa */}
            <Card className="border-red-500/20">
              <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2"><AlertTriangle size={16} /> Excluir Empresa</h3>
              <p className="text-xs text-text-muted mb-3">
                Esta ação é irreversível. Todos os dados da empresa (matriz + filiais), usuários, pontos e registros serão permanentemente excluídos.
              </p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-text-faint mb-1 block">Digite DELETAR para confirmar</label>
                  <input
                    value={confirmDelete}
                    onChange={e => setConfirmDelete(e.target.value)}
                    placeholder="DELETAR"
                    className="w-full bg-elevated border border-red-500/20 rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-slate-600"
                  />
                </div>
                <button
                  onClick={excluirEmpresa}
                  disabled={confirmDelete !== 'DELETAR' || !!busy}
                  className="bg-red-600 hover:bg-red-700 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:bg-red-600/30 shrink-0"
                >
                  {busy === 'excluir' ? 'Excluindo...' : <span className="flex items-center gap-2"><Trash2 size={16} /> Excluir Empresa</span>}
                </button>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
