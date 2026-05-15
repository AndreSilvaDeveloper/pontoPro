'use client';

import { useEffect, useState, Suspense } from 'react';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import { Loader2, Printer } from 'lucide-react';

type Provento = { id: string; tipo: string; descricao: string; valor: number; parcelaAtual: number; parcelaTotal: number };
type Desconto = {
  id: string; tipo: string; descricao: string;
  valorOriginal: number; percentualDesconto: number | null; valorFinal: number;
  parcelaAtual: number; parcelaTotal: number;
};
type Linha = {
  funcionario: { id: string; nome: string; fotoPerfilUrl: string | null };
  salarioBase: number;
  proventos: Provento[];
  descontos: Desconto[];
  totalProventos: number;
  totalDescontos: number;
  salarioBruto: number;
  valorLiquido: number;
  folha: {
    id: string;
    status: string;
    fechadaEm: string | null;
    pagaEm: string | null;
    assinadoEm: string | null;
    assinaturaUrl: string | null;
    recusadoEm: string | null;
    recusadoMotivo: string | null;
  } | null;
};

type Totais = { bruto: number; descontos: number; liquido: number };

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ImpressaoConteudo() {
  const sp = useSearchParams();
  const mes = parseInt(sp.get('mes') || String(new Date().getMonth() + 1), 10);
  const ano = parseInt(sp.get('ano') || String(new Date().getFullYear()), 10);
  const funcionarioId = sp.get('funcionarioId') || null;
  const [loading, setLoading] = useState(true);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [totais, setTotais] = useState<Totais>({ bruto: 0, descontos: 0, liquido: 0 });
  const [empresaNome, setEmpresaNome] = useState<string>('Empresa');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [folhaRes, brandRes] = await Promise.all([
          axios.get('/api/admin/financeiro/folha', { params: { mes, ano } }),
          axios.get('/api/admin/empresa/branding').catch(() => ({ data: null })),
        ]);
        if (cancelado) return;
        const todas: Linha[] = folhaRes.data.linhas || [];
        const filtradas = funcionarioId
          ? todas.filter(l => l.funcionario.id === funcionarioId)
          : todas.filter(l => l.totalProventos > 0 || l.totalDescontos > 0 || l.folha);
        setLinhas(filtradas);
        if (funcionarioId) {
          // Totais individuais
          const l = filtradas[0];
          setTotais(l
            ? { bruto: l.totalProventos, descontos: l.totalDescontos, liquido: l.valorLiquido }
            : { bruto: 0, descontos: 0, liquido: 0 });
        } else {
          // Recalcula com base nas linhas filtradas
          let b = 0, d = 0, lq = 0;
          for (const l of filtradas) { b += l.totalProventos; d += l.totalDescontos; lq += l.valorLiquido; }
          setTotais({
            bruto: Math.round(b * 100) / 100,
            descontos: Math.round(d * 100) / 100,
            liquido: Math.round(lq * 100) / 100,
          });
        }
        if (brandRes.data) {
          setEmpresaNome(brandRes.data.nomeExibicao || brandRes.data.nome || 'Empresa');
          setLogoUrl(brandRes.data.logoUrl || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [mes, ano, funcionarioId]);

  // Auto-trigger print depois do carregamento
  useEffect(() => {
    if (!loading && linhas.length > 0) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [loading, linhas]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-900">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (linhas.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 p-8">
        <div className="max-w-md text-center">
          <p className="text-lg font-bold">Sem lançamentos pra imprimir</p>
          <p className="text-sm text-slate-600 mt-2">
            Não há proventos, descontos ou folhas registrados em {MESES[mes - 1]}/{ano}
            {funcionarioId ? ' pra esse funcionário' : ''}.
          </p>
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const dataGeracao = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const ehIndividual = funcionarioId && linhas.length === 1;

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      {/* Barra de ações (só na tela, some na impressão) */}
      <div className="print:hidden sticky top-0 z-10 bg-slate-100 border-b border-slate-300 px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">
          Pré-visualização — {ehIndividual ? linhas[0].funcionario.nome : 'Folha consolidada'} ({MESES[mes - 1]}/{ano})
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg font-semibold"
          >
            <Printer size={14} /> Imprimir / Salvar PDF
          </button>
          <button
            onClick={() => window.close()}
            className="px-3 py-1.5 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-sm rounded-lg font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Documento */}
      <div className="max-w-4xl mx-auto p-6 sm:p-10 print:p-6">
        {/* Header com branding */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-slate-800">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="w-16 h-16 object-contain rounded-lg" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xl">
                {empresaNome.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{empresaNome}</h1>
              <p className="text-xs text-slate-600 uppercase tracking-widest">
                {ehIndividual ? 'Contracheque' : 'Folha de pagamento'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">Competência</p>
            <p className="text-lg font-bold text-slate-800">{MESES[mes - 1]} / {ano}</p>
            <p className="text-[10px] text-slate-500 mt-2">Gerado em {dataGeracao}</p>
          </div>
        </div>

        {/* Conteúdo */}
        {ehIndividual ? (
          <ContrachequeIndividual linha={linhas[0]} mes={mes} ano={ano} />
        ) : (
          <FolhaConsolidada linhas={linhas} totais={totais} />
        )}

        <div className="mt-12 pt-6 border-t border-slate-300 text-[10px] text-slate-500 text-center">
          Documento gerado pelo sistema WorkID em {dataGeracao}. Apenas para uso interno.
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </div>
  );
}

function ContrachequeIndividual({ linha, mes, ano }: { linha: Linha; mes: number; ano: number }) {
  return (
    <div className="mt-6 space-y-6">
      {/* Dados do funcionário */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Funcionário</p>
            <p className="font-semibold text-slate-900">{linha.funcionario.nome}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Salário base (referência)</p>
            <p className="font-mono">{linha.salarioBase > 0 ? brl(linha.salarioBase) : '—'}</p>
          </div>
          {linha.folha && (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Status</p>
                <p className="font-semibold">{linha.folha.status}</p>
              </div>
              {linha.folha.pagaEm && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Pago em</p>
                  <p className="font-mono">{new Date(linha.folha.pagaEm).toLocaleDateString('pt-BR')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabela Proventos x Descontos */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-bold mb-2 text-emerald-700 uppercase tracking-wide">Proventos</h3>
          <table className="w-full text-sm border border-slate-300 border-collapse">
            <thead>
              <tr className="bg-emerald-50">
                <th className="border border-slate-300 px-2 py-1.5 text-left text-xs">Descrição</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right text-xs w-24">Valor</th>
              </tr>
            </thead>
            <tbody>
              {linha.proventos.length === 0 ? (
                <tr>
                  <td colSpan={2} className="border border-slate-300 px-2 py-2 text-center text-slate-400 text-xs italic">Nenhum provento</td>
                </tr>
              ) : (
                linha.proventos.map(p => (
                  <tr key={p.id}>
                    <td className="border border-slate-300 px-2 py-1.5 text-xs">
                      <span className="text-[9px] uppercase text-slate-500 mr-1">{p.tipo}</span>
                      {p.descricao}
                      {p.parcelaTotal > 1 && <span className="ml-1 text-[10px] text-slate-500">({p.parcelaAtual}/{p.parcelaTotal})</span>}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-xs">{brl(p.valor)}</td>
                  </tr>
                ))
              )}
              <tr className="bg-emerald-50 font-bold">
                <td className="border border-slate-300 px-2 py-1.5 text-xs">Total proventos</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-xs">{brl(linha.totalProventos)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-sm font-bold mb-2 text-red-700 uppercase tracking-wide">Descontos</h3>
          <table className="w-full text-sm border border-slate-300 border-collapse">
            <thead>
              <tr className="bg-red-50">
                <th className="border border-slate-300 px-2 py-1.5 text-left text-xs">Descrição</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right text-xs w-24">Valor</th>
              </tr>
            </thead>
            <tbody>
              {linha.descontos.length === 0 ? (
                <tr>
                  <td colSpan={2} className="border border-slate-300 px-2 py-2 text-center text-slate-400 text-xs italic">Nenhum desconto</td>
                </tr>
              ) : (
                linha.descontos.map(d => (
                  <tr key={d.id}>
                    <td className="border border-slate-300 px-2 py-1.5 text-xs">
                      <span className="text-[9px] uppercase text-slate-500 mr-1">{d.tipo}</span>
                      {d.descricao}
                      {d.parcelaTotal > 1 && <span className="ml-1 text-[10px] text-slate-500">({d.parcelaAtual}/{d.parcelaTotal})</span>}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-xs">{brl(d.valorFinal)}</td>
                  </tr>
                ))
              )}
              <tr className="bg-red-50 font-bold">
                <td className="border border-slate-300 px-2 py-1.5 text-xs">Total descontos</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-xs">{brl(linha.totalDescontos)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo final */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="border border-slate-300 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Bruto</p>
          <p className="text-lg font-mono font-bold mt-1">{brl(linha.salarioBruto)}</p>
        </div>
        <div className="border border-slate-300 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Descontos</p>
          <p className="text-lg font-mono font-bold mt-1 text-red-700">-{brl(linha.totalDescontos)}</p>
        </div>
        <div className="border-2 border-emerald-600 bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Líquido a receber</p>
          <p className="text-xl font-mono font-bold mt-1 text-emerald-700">{brl(linha.valorLiquido)}</p>
        </div>
      </div>

      {/* Assinatura */}
      <div className="grid grid-cols-2 gap-12 mt-14">
        <div>
          {/* Imagem da assinatura digital, quando o funcionário já assinou */}
          <div className="h-16 flex items-end justify-center">
            {linha.folha?.assinaturaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={linha.folha.assinaturaUrl}
                alt="Assinatura"
                className="max-h-16 max-w-[220px] object-contain"
              />
            ) : null}
          </div>
          <div className="border-t border-slate-800 pt-1 text-center text-xs">
            <p className="font-semibold">{linha.funcionario.nome}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">
              Funcionário
              {linha.folha?.assinadoEm
                ? ` · assinado em ${new Date(linha.folha.assinadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
                : ' · aguardando assinatura'}
            </p>
          </div>
        </div>
        <div>
          <div className="h-16" />
          <div className="border-t border-slate-800 pt-1 text-center text-xs">
            <p className="font-semibold">Empresa</p>
            <p className="text-slate-500 text-[10px] mt-0.5">Responsável</p>
          </div>
        </div>
      </div>

      {linha.folha?.status === 'RECUSADA' && linha.folha.recusadoMotivo && (
        <div className="mt-6 border border-rose-300 bg-rose-50 rounded-lg p-3 text-xs text-rose-800">
          <b>Folha contestada pelo funcionário</b>
          {linha.folha.recusadoEm ? ` em ${new Date(linha.folha.recusadoEm).toLocaleDateString('pt-BR')}` : ''}: {linha.folha.recusadoMotivo}
        </div>
      )}
    </div>
  );
}

function FolhaConsolidada({ linhas, totais }: { linhas: Linha[]; totais: Totais }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="text-sm text-slate-600 mb-2">
        <b>{linhas.length}</b> funcionário{linhas.length > 1 ? 's' : ''} com lançamentos no período.
      </div>

      <table className="w-full text-sm border border-slate-300 border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-2 py-1.5 text-left text-xs">Funcionário</th>
            <th className="border border-slate-300 px-2 py-1.5 text-right text-xs w-28">Proventos</th>
            <th className="border border-slate-300 px-2 py-1.5 text-right text-xs w-28">Descontos</th>
            <th className="border border-slate-300 px-2 py-1.5 text-right text-xs w-28">Líquido</th>
            <th className="border border-slate-300 px-2 py-1.5 text-center text-xs w-24">Status</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(l => (
            <tr key={l.funcionario.id}>
              <td className="border border-slate-300 px-2 py-1.5 text-xs">{l.funcionario.nome}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-xs text-emerald-700">+{brl(l.totalProventos)}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-xs text-red-700">-{brl(l.totalDescontos)}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-xs font-bold">{brl(l.valorLiquido)}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center text-[10px]">{l.folha?.status || '—'}</td>
            </tr>
          ))}
          <tr className="bg-slate-100 font-bold">
            <td className="border border-slate-300 px-2 py-2 text-xs">TOTAIS</td>
            <td className="border border-slate-300 px-2 py-2 text-right font-mono text-xs text-emerald-700">+{brl(totais.bruto)}</td>
            <td className="border border-slate-300 px-2 py-2 text-right font-mono text-xs text-red-700">-{brl(totais.descontos)}</td>
            <td className="border border-slate-300 px-2 py-2 text-right font-mono text-xs">{brl(totais.liquido)}</td>
            <td className="border border-slate-300 px-2 py-2"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function ImpressaoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin" size={28} />
      </div>
    }>
      <ImpressaoConteudo />
    </Suspense>
  );
}
