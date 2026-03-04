'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { ShieldAlert, User, Calendar, FileText, CheckCircle, XCircle, Loader, ExternalLink, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface AusenciaPendente {
  id: string;
  dataInicio: string;
  dataFim: string;
  tipo: string;
  motivo: string;
  comprovanteUrl: string | null;
  usuario: {
    nome: string;
    email: string;
  };
  criadoEm: string;
}

export default function GestaoPendencias() {
  const [pendencias, setPendencias] = useState<AusenciaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);

  useEffect(() => {
    carregarPendencias();
  }, []);

  const carregarPendencias = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/ausencias');
      setPendencias(response.data);
    } catch (error) {
      console.error("Erro ao carregar pendências:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAprovarRejeitar = async (id: string, status: 'APROVADO' | 'REJEITADO') => {
    setAcaoEmAndamento(id);
    try {
      await axios.post('/api/admin/ausencias', { id, status });
      toast.success(`Solicitação ${status === 'APROVADO' ? 'APROVADA' : 'REJEITADA'} com sucesso!`);
      carregarPendencias();
    } catch (error) {
      toast.error('Erro ao processar a ação.');
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const formatarData = (data: string) => format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });

  if (loading) {
    return (
      <div className="min-h-screen bg-page text-text-primary flex items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Orbs decorativos */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto p-4 md:p-8 pb-8 space-y-8 relative z-10">

        {/* HEADER ÚNICO (bug fix: removido header duplicado) */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95" title="Voltar">
              <ArrowLeft size={20} />
            </Link>
            <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
              <ShieldAlert size={24} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Gestão de Pendências</h1>
              <p className="text-text-muted text-sm">{pendencias.length} pendência(s)</p>
            </div>
          </div>
        </div>

        {pendencias.length === 0 ? (
          <div className="bg-surface backdrop-blur-sm p-10 rounded-2xl border border-border-subtle text-center text-text-faint animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CheckCircle size={32} className="mx-auto text-green-500/50 mb-3" />
            <p className="font-semibold">Nenhuma pendência de ausência no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
            {pendencias.map((p) => (
              <div key={p.id} className="bg-surface backdrop-blur-sm p-5 rounded-2xl border border-border-subtle shadow-xl space-y-4">
                <p className="text-lg font-bold text-purple-400 border-b border-border-subtle pb-2 flex items-center gap-2">
                  <User size={18} /> {p.usuario.nome}
                </p>

                <div className="text-sm space-y-2">
                  <p className="text-text-muted flex items-center gap-2">
                    <FileText size={16} /> <span className="text-text-primary font-semibold">{p.tipo.replace('_', ' ')}</span>
                  </p>
                  <p className="text-text-muted flex items-center gap-2">
                    <Calendar size={16} />
                    <span className="text-text-primary">De {formatarData(p.dataInicio)} a {formatarData(p.dataFim)}</span>
                  </p>
                  <div className="bg-input-solid/50 p-3 rounded-xl border border-border-subtle mt-2">
                    <p className="text-xs text-text-faint uppercase font-bold mb-1">Motivo:</p>
                    <p className="text-text-secondary italic">&quot;{p.motivo}&quot;</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-border-subtle">
                  {p.comprovanteUrl ? (
                    <a
                      href={p.comprovanteUrl}
                      target="_blank"
                      className="flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-sm py-3 rounded-xl font-bold border border-blue-500/30 transition-all"
                    >
                      <ExternalLink size={16} /> VER COMPROVANTE / ATESTADO
                    </a>
                  ) : (
                    <div className="text-center py-2 bg-elevated rounded-xl border border-border-subtle">
                      <span className="text-xs text-text-faint">Sem anexo enviado.</span>
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleAprovarRejeitar(p.id, 'APROVADO')}
                      disabled={!!acaoEmAndamento}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                    >
                      {acaoEmAndamento === p.id ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleAprovarRejeitar(p.id, 'REJEITADO')}
                      disabled={!!acaoEmAndamento}
                      className="flex-1 bg-red-600/20 hover:bg-red-600 hover:text-white text-red-400 py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors border border-red-900/50 flex items-center justify-center gap-1"
                    >
                      {acaoEmAndamento === p.id ? <Loader size={16} className="animate-spin" /> : <XCircle size={16} />}
                      Rejeitar
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
