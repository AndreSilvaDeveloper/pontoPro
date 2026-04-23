'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  Eye,
  Download,
  Calendar,
  Loader2,
  CheckCircle2,
  PenTool,
} from 'lucide-react';

interface ContrachequeItem {
  id: string;
  mes: string;
  arquivoUrl: string;
  nomeArquivo: string;
  criadoEm: string;
  visualizado: boolean;
  visualizadoEm: string | null;
  assinado: boolean;
  assinadoEm: string | null;
}

const MESES_PT: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Marco', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};

function formatMes(mes: string) {
  const [ano, m] = mes.split('-');
  return `${MESES_PT[m] || m} ${ano}`;
}

export default function ContrachequesFuncionario() {
  const [contracheques, setContracheques] = useState<ContrachequeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const { data } = await axios.get('/api/funcionario/contracheques');
      setContracheques(data);
    } catch {
      toast.error('Erro ao carregar contracheques');
    } finally {
      setLoading(false);
    }
  }

  async function abrirContracheque(c: ContrachequeItem) {
    // Mark as viewed
    if (!c.visualizado) {
      try {
        await axios.put('/api/funcionario/contracheques', { id: c.id });
        setContracheques((prev) =>
          prev.map((item) =>
            item.id === c.id ? { ...item, visualizado: true, visualizadoEm: new Date().toISOString() } : item
          )
        );
      } catch {
        // silent fail
      }
    }
    // Open PDF
    window.open(c.arquivoUrl, '_blank');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-md mx-auto p-4 relative z-10 space-y-4 pb-24">
          <div className="h-8 w-48 bg-hover-bg rounded-lg animate-pulse" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-hover-bg rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-text-secondary font-sans selection:bg-purple-500/30 relative overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md mx-auto p-4 relative z-10 space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/funcionario"
            className="p-2 hover:bg-hover-bg rounded-xl text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
            <FileText size={24} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Contracheques</h1>
            <p className="text-text-muted text-xs font-medium uppercase tracking-widest">Meus Holerites</p>
          </div>
        </div>

        {/* List */}
        {contracheques.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-text-faint mb-4 opacity-40" />
            <p className="text-text-muted text-sm">Nenhum contracheque disponivel</p>
            <p className="text-text-faint text-xs mt-1">Seus holerites aparecerao aqui quando forem enviados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracheques.map((c) => (
              <div
                key={c.id}
                className="bg-elevated border border-border-subtle rounded-2xl p-4 space-y-3 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl border shrink-0 ${
                    c.assinado
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : c.visualizado
                        ? 'bg-elevated border-border-subtle'
                        : 'bg-purple-500/10 border-purple-500/20'
                  }`}>
                    <FileText size={24} className={c.assinado ? 'text-emerald-400' : c.visualizado ? 'text-text-faint' : 'text-purple-400'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-text-primary">{formatMes(c.mes)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar size={10} className="text-text-faint" />
                      <p className="text-[10px] text-text-faint">
                        Enviado em {new Date(c.criadoEm).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {c.visualizado && c.visualizadoEm && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Eye size={10} className="text-blue-400" />
                        <p className="text-[10px] text-blue-400">
                          Visualizado em {new Date(c.visualizadoEm).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {c.assinado && c.assinadoEm && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={10} className="text-emerald-400" />
                        <p className="text-[10px] text-emerald-400">
                          Assinado em {new Date(c.assinadoEm).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {!c.visualizado && (
                      <span className="w-2.5 h-2.5 bg-purple-500 rounded-full block animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirContracheque(c)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    <Download size={14} /> Abrir PDF
                  </button>
                  {!c.assinado && (
                    <button
                      onClick={async () => {
                        if (!confirm('Confirma o recebimento deste contracheque com sua assinatura digital?')) return;
                        try {
                          await axios.put('/api/funcionario/contracheques', { id: c.id, assinar: true });
                          toast.success('Contracheque assinado!');
                          setContracheques(prev => prev.map(item =>
                            item.id === c.id ? { ...item, assinado: true, assinadoEm: new Date().toISOString(), visualizado: true, visualizadoEm: item.visualizadoEm || new Date().toISOString() } : item
                          ));
                        } catch (err: any) {
                          toast.error(err.response?.data?.erro || 'Erro ao assinar');
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      <PenTool size={14} /> Assinar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
