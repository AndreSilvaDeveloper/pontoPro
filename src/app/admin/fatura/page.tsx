'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  ArrowLeft,
  Receipt,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Lock,
  QrCode,
  FileText,
  CreditCard,
  Crown,
  ChevronRight,
  Building2,
} from 'lucide-react';
import PaymentModal, { type AsaasBundle, type PayMode } from '@/components/billing/PaymentModal';
import type { BillingStatus } from '@/lib/billing';

const fmtBRL = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function parseDataBR(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
const fmtData = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR') : '—');

type FaturaApi = {
  empresa: { nome: string; isFilial?: boolean; billingMethod?: string };
  billing: BillingStatus;
  fatura: { valor: number; vencimentoISO: string | null; pago: boolean; billingCycle: string };
};

const TONS: Record<string, { borda: string; fundo: string; icoBg: string; texto: string; sub: string; icone: any }> = {
  emerald: { borda: 'border-emerald-500/20', fundo: 'bg-emerald-950/20', icoBg: 'bg-emerald-500/10 text-emerald-400', texto: 'text-emerald-300', sub: 'text-emerald-400/60', icone: CheckCircle },
  amber: { borda: 'border-amber-500/20', fundo: 'bg-amber-950/20', icoBg: 'bg-amber-500/10 text-amber-400', texto: 'text-amber-300', sub: 'text-amber-400/60', icone: Clock },
  red: { borda: 'border-red-500/20', fundo: 'bg-red-950/20', icoBg: 'bg-red-500/10 text-red-400', texto: 'text-red-300', sub: 'text-red-400/60', icone: AlertTriangle },
};

function tomDoCodigo(code: BillingStatus['code']): keyof typeof TONS {
  if (code === 'OK') return 'emerald';
  if (code === 'PAST_DUE' || code === 'BLOCKED' || code === 'MANUAL_BLOCK' || code === 'TRIAL_EXPIRED') return 'red';
  return 'amber';
}

function tituloStatus(b: BillingStatus, venc: Date | null): string {
  const d = b.days ?? 0;
  const dia = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;
  switch (b.code) {
    case 'OK': return b.paidForCycle ? 'Assinatura em dia' : 'Sem nada pendente';
    case 'DUE_SOON': return d === 0 ? 'Sua fatura vence hoje' : `Sua fatura vence em ${dia(d)}`;
    case 'PAST_DUE': return `Fatura vencida há ${dia(d)}`;
    case 'BLOCKED': return 'Acesso suspenso por falta de pagamento';
    case 'MANUAL_BLOCK': return 'Conta bloqueada — fale com o suporte';
    case 'TRIAL_ACTIVE':
    case 'TRIAL_ENDING': return `Período de teste — faltam ${dia(d)}`;
    case 'TRIAL_EXPIRED': return 'Seu período de teste acabou';
    case 'PENDING_FIRST_INVOICE': return `Sua primeira fatura vence em ${dia(d)}`;
    default: return 'Situação da sua assinatura';
  }
}

function subStatus(b: BillingStatus, venc: Date | null): string {
  if (b.code === 'OK' && b.paidForCycle && venc) return `Próximo vencimento em ${fmtData(venc)}.`;
  return b.message || '';
}

export default function FaturaAdminPage() {
  const [data, setData] = useState<FaturaApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFilial, setIsFilial] = useState(false);

  // pagamento via Asaas (mesma mecânica de "Minha Conta")
  const [asaas, setAsaas] = useState<AsaasBundle | null>(null);
  const [loadingAsaas, setLoadingAsaas] = useState(false);
  const [msgAsaas, setMsgAsaas] = useState<string | null>(null);
  const [openPay, setOpenPay] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>('PIX');

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/admin/faturas');
        if (!res.data?.ok) return;
        if (res.data?.empresa?.isFilial) { setIsFilial(true); return; }
        setData(res.data as FaturaApi);
      } catch (e) {
        console.error('Erro ao carregar fatura', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const carregarCobrancaAtual = async () => {
    try {
      const res = await axios.get('/api/admin/asaas/cobranca-atual');
      if (!res.data?.ok) return;
      if (res.data?.hasPayment) setAsaas(res.data.asaas);
      else setAsaas(null);
    } catch (e) {
      console.error('Erro ao buscar cobrança atual', e);
    }
  };

  const gerarCobrancaAsaas = async () => {
    setLoadingAsaas(true);
    setMsgAsaas(null);
    try {
      const res = await axios.post('/api/admin/asaas/gerar-cobranca');
      if (!res.data?.ok) throw new Error('Falha ao gerar cobrança');
      setAsaas(res.data.asaas);
      setMsgAsaas('Cobrança carregada/atualizada!');
    } catch (e) {
      console.error('Erro ao gerar cobrança ASAAS', e);
      setMsgAsaas('Erro ao gerar cobrança. Tente novamente.');
    } finally {
      setLoadingAsaas(false);
    }
  };

  const abrirPagamento = async (mode: PayMode = 'PIX') => {
    setPayMode(mode);
    setMsgAsaas(null);
    setLoadingAsaas(true);
    setOpenPay(true);
    try {
      await carregarCobrancaAtual();
      if (!asaas) await gerarCobrancaAsaas();
    } catch {
      await gerarCobrancaAsaas();
    } finally {
      setLoadingAsaas(false);
    }
  };

  const atalhos = [
    { href: '/admin/perfil/plano', label: 'Meu Plano', desc: 'Assinatura', icon: Crown, cor: 'purple' },
    { href: '/admin/perfil/pagamento', label: 'Pagamento', desc: 'Ciclo e método', icon: CreditCard, cor: 'emerald' },
    { href: '/admin/perfil/historico', label: 'Histórico', desc: 'Faturas anteriores', icon: Receipt, cor: 'neutral' },
  ] as const;

  const corAtalho: Record<string, { ico: string; hover: string; chev: string }> = {
    purple: { ico: 'bg-purple-500/10 text-purple-400', hover: 'hover:border-purple-500/30', chev: 'group-hover:text-purple-400' },
    emerald: { ico: 'bg-emerald-500/10 text-emerald-400', hover: 'hover:border-emerald-500/30', chev: 'group-hover:text-emerald-400' },
    neutral: { ico: 'bg-elevated-solid text-text-muted', hover: 'hover:border-border-default', chev: 'group-hover:text-text-muted' },
  };

  const venc = parseDataBR(data?.fatura?.vencimentoISO);
  const b = data?.billing;
  const tom = b ? TONS[tomDoCodigo(b.code)] : TONS.amber;
  const Icone = tom.icone;
  const isTrial = b?.phase === 'TRIAL';
  const isCartao = data?.empresa?.billingMethod === 'CREDIT_CARD';

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <PaymentModal
        open={openPay}
        onClose={() => setOpenPay(false)}
        asaas={asaas}
        loading={loadingAsaas}
        onRefresh={carregarCobrancaAtual}
        onGenerate={gerarCobrancaAsaas}
        msg={msgAsaas}
        setMsg={setMsgAsaas}
        mode={payMode}
      />

      {/* Topo */}
      <header className="sticky top-0 z-20 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/admin" className="shrink-0 rounded-xl bg-elevated/80 p-2.5 text-text-muted hover:bg-elevated-solid hover:text-text-primary transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-amber-500/15 p-1.5 rounded-lg border border-amber-500/25 shrink-0">
              <Receipt size={18} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold leading-tight">Fatura</h1>
              <p className="text-[11px] text-text-faint">Pague sua assinatura e acompanhe a cobrança</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {loading && (
          <div className="space-y-5">
            <div className="h-24 bg-hover-bg rounded-2xl animate-pulse" />
            <div className="h-44 bg-hover-bg rounded-2xl animate-pulse" />
            <div className="h-20 bg-hover-bg rounded-2xl animate-pulse" />
          </div>
        )}

        {!loading && isFilial && (
          <div className="bg-surface border border-border-subtle rounded-2xl p-6 flex items-start gap-4">
            <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-xl shrink-0"><Building2 size={20} /></div>
            <div>
              <p className="font-bold text-text-primary">Esta unidade é uma filial</p>
              <p className="text-sm text-text-muted mt-1">A cobrança é feita na conta da matriz. Fale com o responsável pela matriz para ver e pagar a fatura.</p>
            </div>
          </div>
        )}

        {!loading && !isFilial && !data && (
          <div className="bg-surface border border-border-subtle rounded-2xl p-6 text-center text-text-muted text-sm">
            Não foi possível carregar a fatura agora. Recarregue a página em alguns instantes.
          </div>
        )}

        {!loading && !isFilial && data && b && (
          <>
            {/* Status */}
            <div className={`rounded-2xl border ${tom.borda} ${tom.fundo} p-5`}>
              <div className="flex items-center gap-4">
                <div className={`shrink-0 rounded-xl p-3 ${tom.icoBg}`}><Icone size={22} /></div>
                <div className="min-w-0">
                  <p className={`font-bold ${tom.texto}`}>{tituloStatus(b, venc)}</p>
                  {subStatus(b, venc) && <p className={`text-sm ${tom.sub}`}>{subStatus(b, venc)}</p>}
                </div>
              </div>
            </div>

            {/* Realizar pagamento (Asaas) — não aparece no trial nem com cartão automático */}
            {!isTrial && !isCartao && (
              <div className="rounded-2xl border border-border-subtle bg-surface backdrop-blur-sm p-6">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
                    <CreditCard size={16} className="text-emerald-400" />
                    Realizar pagamento
                  </h3>
                  <p className="text-xs text-text-faint">
                    {venc && <>Vencimento: <span className="text-text-primary font-medium">{fmtData(venc)}</span> &middot; </>}
                    <span className="text-emerald-400 font-bold">
                      {fmtBRL(Number(data.fatura.valor ?? 0))}{data.fatura.billingCycle === 'YEARLY' ? '/ano' : '/mês'}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => abrirPagamento('PIX')}
                    className="group flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-5 transition-all hover:border-emerald-500/40 hover:bg-emerald-950/30"
                  >
                    <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors"><QrCode size={24} /></div>
                    <div className="text-center">
                      <p className="font-bold text-sm text-emerald-300">Pix</p>
                      <p className="text-[11px] text-emerald-400/50 mt-0.5">QR Code e copia e cola</p>
                    </div>
                  </button>

                  <button
                    onClick={() => abrirPagamento('BOLETO')}
                    className="group flex flex-col items-center gap-3 rounded-xl border border-border-input bg-surface p-5 transition-all hover:bg-elevated"
                  >
                    <div className="rounded-xl bg-elevated-solid p-3 text-text-muted transition-colors"><FileText size={24} /></div>
                    <div className="text-center">
                      <p className="font-bold text-sm text-text-secondary">Boleto</p>
                      <p className="text-[11px] text-text-faint mt-0.5">Linha digitável e PDF</p>
                    </div>
                  </button>
                </div>

                <p className="text-[11px] text-text-faint mt-4">
                  O pagamento é confirmado automaticamente — assim que cair, o acesso é liberado sem precisar enviar comprovante.
                </p>
              </div>
            )}

            {/* Cartão automático */}
            {!isTrial && isCartao && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5 flex items-center gap-4">
                <div className="shrink-0 rounded-xl bg-emerald-500/10 p-3 text-emerald-400"><CheckCircle size={22} /></div>
                <div>
                  <p className="font-bold text-emerald-300">Pagamento automático ativo</p>
                  <p className="text-sm text-emerald-400/60">
                    A cobrança é feita no seu cartão de crédito todo ciclo — você não precisa fazer nada.{' '}
                    <Link href="/admin/perfil/pagamento" className="underline hover:text-emerald-300 transition-colors">Gerenciar</Link>
                  </p>
                </div>
              </div>
            )}

            {/* Trial */}
            {isTrial && (
              <div className="rounded-2xl border border-border-subtle bg-surface p-5 text-sm text-text-secondary">
                Você ainda está no período de teste — não há fatura para pagar agora. Quando o teste acabar, a cobrança aparece aqui automaticamente.
              </div>
            )}

            {/* Atalhos */}
            <div className="grid gap-3 sm:grid-cols-3">
              {atalhos.map(({ href, label, desc, icon: Icon, cor }) => {
                const c = corAtalho[cor];
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface backdrop-blur-sm p-4 transition-all hover:bg-surface-solid ${c.hover}`}
                  >
                    <div className={`shrink-0 rounded-xl p-2.5 transition-colors ${c.ico}`}><Icon size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{label}</p>
                      <p className="text-[11px] text-text-faint">{desc}</p>
                    </div>
                    <ChevronRight size={16} className={`shrink-0 text-text-dim transition-colors ${c.chev}`} />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
