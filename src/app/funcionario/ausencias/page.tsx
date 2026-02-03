'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Upload, FileText, Calendar, PlusCircle, CheckCircle, XCircle, Clock, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function MinhasAusencias() {
  const [ausencias, setAusencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [modalAberto, setModalAberto] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null); // Se tiver ID, é edição
  
  const [tipo, setTipo] = useState('ATESTADO');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);

  useEffect(() => { carregarAusencias(); }, []);

  const carregarAusencias = async () => {
    try {
        const res = await axios.get('/api/funcionario/solicitar-ausencia');
        setAusencias(res.data);
    } catch (error: any) {
        console.error("Erro:", error);
    }
  };

  const abrirModalNovo = () => {
      setIdEdicao(null);
      setTipo('ATESTADO'); setDataInicio(''); setDataFim(''); setMotivo(''); setArquivo(null);
      setModalAberto(true);
  };

  const abrirModalEdicao = (item: any) => {
      setIdEdicao(item.id);
      setTipo(item.tipo);
      // Formata data para o input HTML (yyyy-MM-dd)
      setDataInicio(format(new Date(item.dataInicio), 'yyyy-MM-dd'));
      setDataFim(format(new Date(item.dataFim), 'yyyy-MM-dd'));
      setMotivo(item.motivo);
      setArquivo(null); // Reseta arquivo (se não enviar novo, mantem o velho)
      setModalAberto(true);
  };

  const salvarSolicitacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataInicio || !motivo) return alert('Preencha os campos obrigatórios.');
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('dataInicio', dataInicio);
      formData.append('dataFim', dataFim || dataInicio);
      formData.append('tipo', tipo);
      formData.append('motivo', motivo);
      if (arquivo) formData.append('comprovante', arquivo);

      if (idEdicao) {
          // MODO EDIÇÃO
          formData.append('id', idEdicao);
          await axios.put('/api/funcionario/solicitar-ausencia', formData);
          alert('Solicitação corrigida com sucesso!');
      } else {
          // MODO CRIAÇÃO
          await axios.post('/api/funcionario/solicitar-ausencia', formData);
          alert('Solicitação enviada com sucesso!');
      }

      setModalAberto(false);
      carregarAusencias();
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const excluirSolicitacao = async (id: string) => {
    if(!confirm("Tem certeza que deseja cancelar esta solicitação?")) return;
    try {
        await axios.delete(`/api/funcionario/solicitar-ausencia?id=${id}`);
        carregarAusencias();
    } catch (error: any) {
        alert(error.response?.data?.erro || "Erro ao excluir");
    }
  };

  // Helper Cores
  const getStatusColor = (status: string) => {
    switch(status) {
        case 'APROVADO': return 'bg-green-500/10 text-green-500 border-green-500/20';
        case 'REJEITADO': return 'bg-red-500/10 text-red-500 border-red-500/20';
        default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
        case 'APROVADO': return <CheckCircle size={14} />;
        case 'REJEITADO': return <XCircle size={14} />;
        default: return <Clock size={14} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="text-purple-400" />
            <h1 className="text-xl font-bold">Justificar Ausência</h1>
          </div>
          <Link href="/funcionario" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"><ArrowLeft size={20} /></Link>
        </div>

        <button 
            onClick={abrirModalNovo}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 active:scale-95"
        >
            <PlusCircle size={20} /> Nova Justificativa / Atestado
        </button>

        <div className="space-y-4">
             <h2 className="text-sm text-slate-500 font-bold uppercase tracking-wider">Histórico</h2>
             
             {ausencias.length === 0 ? (
                 <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 text-center text-slate-500"><p>Nenhuma solicitação encontrada.</p></div>
             ) : (
                 <div className="space-y-3">
                    {ausencias.map((item) => (
                        <div key={item.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 w-fit ${getStatusColor(item.status)}`}>
                                            {getStatusIcon(item.status)} {item.status}
                                        </span>
                                        <span className="text-xs text-slate-500">{format(new Date(item.criadoEm), "dd/MM HH:mm")}</span>
                                    </div>
                                    <p className="font-bold text-white text-sm">{item.tipo.replace('_', ' ')}</p>
                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar size={12}/> {format(new Date(item.dataInicio), 'dd/MM/yyyy')} 
                                        {item.dataFim && item.dataFim !== item.dataInicio && ` até ${format(new Date(item.dataFim), 'dd/MM')}`}
                                    </p>
                                </div>
                            </div>

                            {/* RODAPÉ DE AÇÕES (SÓ SE ESTIVER PENDENTE) */}
                            {item.status === 'PENDENTE' && (
                                <div className="flex gap-2 pt-2 border-t border-slate-800">
                                    <button 
                                        onClick={() => abrirModalEdicao(item)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white py-2 rounded-lg text-xs font-bold transition-all"
                                    >
                                        <Pencil size={14} /> Corrigir
                                    </button>
                                    <button 
                                        onClick={() => excluirSolicitacao(item.id)}
                                        className="w-10 flex items-center justify-center bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                                        title="Cancelar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                 </div>
             )}
        </div>

        {/* MODAL DE SOLICITAÇÃO / EDIÇÃO */}
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <FileText size={20} className="text-purple-400"/> 
                 {idEdicao ? 'Corrigir Solicitação' : 'Nova Justificativa'}
              </h3>

              <form onSubmit={salvarSolicitacao} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Tipo</label>
                    <select value={tipo} onChange={e=>setTipo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-sm outline-none focus:border-purple-500">
                        <option value="ATESTADO">Atestado Médico</option>
                        <option value="FALTA_JUSTIFICADA">Falta Justificada (Outros)</option>
                        <option value="FERIAS">Férias</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Início</label>
                        <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm text-center" required />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Fim</label>
                        <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm text-center" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Motivo / CID</label>
                    <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-sm h-24 resize-none focus:border-purple-500 outline-none" required />
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 border-dashed">
                    <label className="flex flex-col items-center gap-2 cursor-pointer">
                        <Upload size={24} className="text-slate-400" />
                        <span className="text-xs text-slate-400 text-center">
                            {arquivo ? arquivo.name : (idEdicao ? 'Alterar Foto (Opcional)' : 'Anexar Foto')}
                        </span>
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setArquivo(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setModalAberto(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg font-bold text-sm">Cancelar</button>
                    <button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold text-sm">
                        {loading ? 'Salvando...' : (idEdicao ? 'Atualizar' : 'Enviar')}
                    </button>
                  </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}