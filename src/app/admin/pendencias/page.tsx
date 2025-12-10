'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { ShieldAlert, User, Calendar, FileText, CheckCircle, XCircle, Loader, ExternalLink, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
      alert(`Solicitação ${status === 'APROVADO' ? 'APROVADA' : 'REJEITADA'} com sucesso!`);
      carregarPendencias(); 
    } catch (error) {
      alert('Erro ao processar a ação.');
    } finally {
      setAcaoEmAndamento(null);
    }
  };
  
  const formatarData = (data: string) => format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center"><Loader className="animate-spin text-purple-500" /> Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <ShieldAlert className="text-red-500" />
          <h1 className="text-2xl font-bold">Gestão de Pendências ({pendencias.length})</h1>
        </div>

        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-bold text-purple-400">Solicitações de Ajuste</h1>
          <Link href="/admin" className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft size={20} /> Voltar</Link>
        </div>

        {pendencias.length === 0 ? (
          <div className="bg-slate-900/50 p-10 rounded-xl border border-slate-800 text-center text-slate-500">
            <CheckCircle size={32} className="mx-auto text-green-500/50 mb-3" />
            <p className="font-semibold">Nenhuma pendência de ausência no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendencias.map((p) => (
              <div key={p.id} className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-xl space-y-4">
                <p className="text-lg font-bold text-purple-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <User size={18} /> {p.usuario.nome}
                </p>
                
                <div className="text-sm space-y-2">
                    <p className="text-slate-400 flex items-center gap-2">
                        <FileText size={16} /> <span className="text-white font-semibold">{p.tipo.replace('_', ' ')}</span>
                    </p>
                    <p className="text-slate-400 flex items-center gap-2">
                        <Calendar size={16} /> 
                        <span className="text-white">De {formatarData(p.dataInicio)} a {formatarData(p.dataFim)}</span>
                    </p>
                    <div className="bg-slate-950 p-3 rounded border border-slate-800 mt-2">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Motivo:</p>
                        <p className="text-slate-300 italic">"{p.motivo}"</p>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
                    
                    {/* === CORREÇÃO AQUI: Exibe se tiver URL, independente do tipo === */}
                    {p.comprovanteUrl ? (
                        <a 
                            href={p.comprovanteUrl} 
                            target="_blank" 
                            className="flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-sm py-3 rounded-lg font-bold border border-blue-500/30 transition-all"
                        >
                            <ExternalLink size={16} /> VER COMPROVANTE / ATESTADO
                        </a>
                    ) : (
                        <div className="text-center py-2 bg-slate-800/50 rounded-lg border border-slate-800">
                            <span className="text-xs text-slate-500">Sem anexo enviado.</span>
                        </div>
                    )}

                    <div className="flex gap-2 mt-2">
                        <button 
                            onClick={() => handleAprovarRejeitar(p.id, 'APROVADO')}
                            disabled={!!acaoEmAndamento}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                        >
                            {acaoEmAndamento === p.id ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            Aprovar
                        </button>
                        <button 
                            onClick={() => handleAprovarRejeitar(p.id, 'REJEITADO')}
                            disabled={!!acaoEmAndamento}
                            className="flex-1 bg-red-600/20 hover:bg-red-600 hover:text-white text-red-400 py-3 rounded-lg font-bold text-sm disabled:opacity-50 transition-colors border border-red-900/50 flex items-center justify-center gap-1"
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