'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, Loader2, Calendar, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ResumoFuncionario {
  totalMinutosTrabalhados: number;
  totalHorasTrabalhadas: string;
  totalMetaMinutos: number;
  totalMetaHoras: string;
  saldoMinutos: number;
  saldoFormatado: string;
  saldoPositivo: boolean;
  diasTrabalhados: number;
  diasFalta: number;
  diasAtraso: number;
  diasAusenciaJustificada: number;
  diasFeriado: number;
}

interface FuncionarioRelatorio {
  id: string;
  nome: string;
  cargo: string;
  resumo: ResumoFuncionario;
  dias: {
    data: string;
    diaSemana: string;
    status: string;
    entrada: string | null;
    saida: string | null;
    minutosTrabalhados: number;
    metaMinutos: number;
    saldo: number;
  }[];
}

interface RelatorioMensal {
  dataInicio: string;
  dataFim: string;
  empresa: string;
  geradoEm: string;
  funcionarios: FuncionarioRelatorio[];
  resumoGeral: {
    totalFuncionarios: number;
    mediaHorasTrabalhadas: string;
    totalFaltas: number;
    totalAtrasos: number;
  };
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default function RelatorioMensalPage() {
  const now = new Date();
  // Default: day 20 of previous month to day 19 of current month
  const mesAtual = now.getMonth(); // 0-based
  const anoAtual = now.getFullYear();

  const inicioDefault = new Date(anoAtual, mesAtual - 1, 20);
  const fimDefault = new Date(anoAtual, mesAtual, 19);

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const [dataInicio, setDataInicio] = useState(toDateStr(inicioDefault));
  const [dataFim, setDataFim] = useState(toDateStr(fimDefault));
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioMensal | null>(null);
  const [erro, setErro] = useState('');

  async function gerarRelatorio() {
    setLoading(true);
    setErro('');
    setRelatorio(null);
    try {
      const res = await fetch(`/api/admin/relatorio-mensal?dataInicio=${dataInicio}&dataFim=${dataFim}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.erro || 'Erro ao gerar relatorio');
      }
      const data: RelatorioMensal = await res.json();
      setRelatorio(data);
    } catch (e: any) {
      setErro(e.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  function gerarDocPDF(): jsPDF | null {
    if (!relatorio) return null;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('WorkID', 14, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(relatorio.empresa, 14, 28);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Folha de Ponto - ${formatDateBR(relatorio.dataInicio)} a ${formatDateBR(relatorio.dataFim)}`, 14, 40);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date(relatorio.geradoEm).toLocaleString('pt-BR')}`, 14, 48);

    const headers = ['Nome', 'Cargo', 'Dias Trab.', 'Faltas', 'Atrasos', 'Horas Trab.', 'Meta', 'Saldo'];

    const rows = relatorio.funcionarios.map((f) => [
      f.nome,
      f.cargo,
      String(f.resumo.diasTrabalhados),
      String(f.resumo.diasFalta),
      String(f.resumo.diasAtraso),
      f.resumo.totalHorasTrabalhadas,
      f.resumo.totalMetaHoras,
      f.resumo.saldoFormatado,
    ]);

    const totalTrab = relatorio.funcionarios.reduce((s, f) => s + f.resumo.diasTrabalhados, 0);
    const totalFaltas = relatorio.resumoGeral.totalFaltas;
    const totalAtrasos = relatorio.resumoGeral.totalAtrasos;
    const totalMinutos = relatorio.funcionarios.reduce((s, f) => s + f.resumo.totalMinutosTrabalhados, 0);
    const totalMeta = relatorio.funcionarios.reduce((s, f) => s + f.resumo.totalMetaMinutos, 0);
    const totalSaldo = totalMinutos - totalMeta;

    const formatMin = (m: number) => {
      const abs = Math.abs(m);
      const h = Math.floor(abs / 60);
      const min = abs % 60;
      return `${h}h${String(min).padStart(2, '0')}`;
    };

    rows.push([
      'TOTAL',
      '',
      String(totalTrab),
      String(totalFaltas),
      String(totalAtrasos),
      formatMin(totalMinutos),
      formatMin(totalMeta),
      `${totalSaldo >= 0 ? '+' : '-'}${formatMin(totalSaldo)}`,
    ]);

    autoTable(doc, {
      startY: 54,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [107, 70, 193], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      didParseCell: (data) => {
        if (data.row.index === rows.length - 1 && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [230, 225, 245];
        }
      },
    });

    return doc;
  }

  function visualizarPDF() {
    const doc = gerarDocPDF();
    if (!doc) return;
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  function exportarPDF() {
    const doc = gerarDocPDF();
    if (!doc || !relatorio) return;
    doc.save(`folha-ponto-${relatorio.dataInicio}-a-${relatorio.dataFim}.pdf`);
  }

  return (
    <div className="min-h-screen bg-page text-text-secondary font-sans selection:bg-purple-500/30 relative overflow-x-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto p-4 md:p-8 pb-8 relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Link
            href="/admin/dashboard"
            className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
              <FileText size={24} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Folha de Ponto</h1>
              <p className="text-text-muted text-xs font-medium uppercase tracking-widest">Relatorio por periodo</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-page backdrop-blur-xl border border-border-subtle p-5 rounded-3xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '50ms' }}>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center bg-page border border-border-default rounded-xl p-2 sm:p-1">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-text-dim text-[10px] uppercase font-bold sm:hidden ml-1 w-6">De</span>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-transparent text-sm text-text-secondary outline-none p-2 w-full text-center cursor-pointer hover:text-text-primary transition-colors"
                />
              </div>
              <span className="text-text-dim text-xs hidden sm:block">até</span>
              <div className="flex items-center gap-2 flex-1 border-t sm:border-t-0 border-border-subtle pt-2 sm:pt-0">
                <span className="text-text-dim text-[10px] uppercase font-bold sm:hidden ml-1 w-6">Até</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-transparent text-sm text-text-secondary outline-none p-2 w-full text-center cursor-pointer hover:text-text-primary transition-colors"
                />
              </div>
            </div>

            <button
              onClick={gerarRelatorio}
              disabled={loading}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-elevated-solid disabled:text-text-faint text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <FileText size={16} /> Gerar Relatorio
                </>
              )}
            </button>
          </div>

          {dataInicio && dataFim && (() => {
            const diff = Math.ceil((new Date(dataFim + 'T00:00:00').getTime() - new Date(dataInicio + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return (
              <p className="text-[11px] text-text-faint mt-3 ml-1">
                Periodo: {formatDateBR(dataInicio)} a {formatDateBR(dataFim)}
                {diff > 0 && (
                  <span className="ml-2 bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-md font-bold">
                    {diff} {diff === 1 ? 'dia' : 'dias'}
                  </span>
                )}
              </p>
            );
          })()}
        </div>

        {/* Error */}
        {erro && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl text-sm font-medium">
            {erro}
          </div>
        )}

        {/* Results */}
        {relatorio && (
          <div className="space-y-6">
            {/* Period label */}
            <div className="text-center">
              <p className="text-sm text-text-muted">
                {formatDateBR(relatorio.dataInicio)} a {formatDateBR(relatorio.dataFim)}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-surface backdrop-blur-md p-5 rounded-2xl border border-border-subtle shadow-lg">
                <h3 className="text-[10px] text-text-dim font-bold uppercase tracking-wider mb-2">Funcionarios</h3>
                <p className="text-2xl font-bold text-text-primary">{relatorio.resumoGeral.totalFuncionarios}</p>
              </div>
              <div className="bg-surface backdrop-blur-md p-5 rounded-2xl border border-border-subtle shadow-lg">
                <h3 className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-2">Media Horas</h3>
                <p className="text-2xl font-bold text-text-primary">{relatorio.resumoGeral.mediaHorasTrabalhadas}</p>
              </div>
              <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20 shadow-lg">
                <h3 className="text-[10px] text-red-400 uppercase font-bold tracking-wider mb-2">Total Faltas</h3>
                <p className="text-2xl font-bold text-red-400">{relatorio.resumoGeral.totalFaltas}</p>
              </div>
              <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20 shadow-lg">
                <h3 className="text-[10px] text-amber-400 uppercase font-bold tracking-wider mb-2">Total Atrasos</h3>
                <p className="text-2xl font-bold text-amber-400">{relatorio.resumoGeral.totalAtrasos}</p>
              </div>
            </div>

            {/* PDF Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={visualizarPDF}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2"
              >
                <Eye size={16} /> Visualizar PDF
              </button>
              <button
                onClick={exportarPDF}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2"
              >
                <Download size={16} /> Baixar PDF
              </button>
            </div>

            {/* Employees Table */}
            <div className="bg-page backdrop-blur-xl border border-border-subtle rounded-3xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="text-left p-4 text-[10px] uppercase font-bold text-text-faint tracking-wider">Nome</th>
                      <th className="text-left p-4 text-[10px] uppercase font-bold text-text-faint tracking-wider">Cargo</th>
                      <th className="text-center p-4 text-[10px] uppercase font-bold text-text-faint tracking-wider">Dias Trab.</th>
                      <th className="text-center p-4 text-[10px] uppercase font-bold text-text-faint tracking-wider">Faltas</th>
                      <th className="text-center p-4 text-[10px] uppercase font-bold text-text-faint tracking-wider">Atrasos</th>
                      <th className="text-center p-4 text-[10px] uppercase font-bold text-text-faint tracking-wider">Ausencias</th>
                      <th className="text-center p-4 text-[10px] uppercase font-bold text-text-faint tracking-wider">Feriados</th>
                      <th className="text-center p-4 text-[10px] uppercase font-bold text-text-faint tracking-wider">Horas Trab.</th>
                      <th className="text-center p-4 text-[10px] uppercase font-bold text-text-faint tracking-wider">Meta</th>
                      <th className="text-center p-4 text-[10px] uppercase font-bold text-text-faint tracking-wider">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.funcionarios.map((f) => (
                      <tr key={f.id} className="border-b border-border-subtle/50 hover:bg-hover-bg transition-colors">
                        <td className="p-4 font-semibold text-text-primary">{f.nome}</td>
                        <td className="p-4 text-text-muted">{f.cargo}</td>
                        <td className="p-4 text-center text-text-secondary">{f.resumo.diasTrabalhados}</td>
                        <td className="p-4 text-center">
                          <span className={f.resumo.diasFalta > 0 ? 'text-red-400 font-bold' : 'text-text-secondary'}>
                            {f.resumo.diasFalta}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={f.resumo.diasAtraso > 0 ? 'text-amber-400 font-bold' : 'text-text-secondary'}>
                            {f.resumo.diasAtraso}
                          </span>
                        </td>
                        <td className="p-4 text-center text-text-secondary">{f.resumo.diasAusenciaJustificada}</td>
                        <td className="p-4 text-center text-text-secondary">{f.resumo.diasFeriado}</td>
                        <td className="p-4 text-center font-mono text-text-primary">{f.resumo.totalHorasTrabalhadas}</td>
                        <td className="p-4 text-center font-mono text-text-muted">{f.resumo.totalMetaHoras}</td>
                        <td className="p-4 text-center font-mono font-bold">
                          <span className={f.resumo.saldoPositivo ? 'text-emerald-400' : 'text-rose-400'}>
                            {f.resumo.saldoFormatado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {relatorio.funcionarios.length === 0 && (
                <div className="p-12 text-center text-text-faint text-sm">
                  Nenhum funcionario encontrado.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
