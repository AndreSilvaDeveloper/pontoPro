'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Upload, FileText, Calendar, PlusCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function MinhasAusencias() {
  const [ausencias, setAusencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [tipo, setTipo] = useState('ATESTADO');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);

  useEffect(() => {
    carregarAusencias();
  }, []);

  const carregarAusencias = async () => {
    // Vamos precisar criar esse GET depois, ou usar server action. 
    // Por enquanto, vamos simular que a listagem vem vazia ou criar um GET simples depois.
    // Para simplificar, vou deixar vazio até criarmos o GET, ou você pode pular o GET agora.
  };

  const enviarSolicitacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataInicio || !dataFim || !motivo) return alert('Preencha os campos obrigatórios.');
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('dataInicio', dataInicio);
      formData.append('dataFim', dataFim);
      formData.append('tipo', tipo);
      formData.append('motivo', motivo);
      if (arquivo) formData.append('comprovante', arquivo);

      await axios.post('/api/funcionario/solicitar-ausencia', formData);
      alert('Solicitação enviada com sucesso!');
      setModalAberto(false);
      // Limpar campos
      setMotivo(''); setArquivo(null);
    } catch (error) {
      alert('Erro ao enviar.');
    } finally {
      setLoading(false);
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
          <Link href="/" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"><ArrowLeft size={20} /></Link>
        </div>

        <button 
            onClick={() => setModalAberto(true)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
        >
            <PlusCircle size={20} /> Nova Justificativa / Atestado
        </button>

        <div className="space-y-4">
             <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 text-center text-slate-500">
                <p>O histórico de ausências aparecerá aqui.</p>
                <p className="text-xs mt-2">(Funcionalidade de listagem em desenvolvimento)</p>
             </div>
        </div>

        {/* MODAL DE SOLICITAÇÃO */}
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <FileText size={20} className="text-purple-400"/> Justificar Falta
              </h3>

              <form onSubmit={enviarSolicitacao} className="space-y-4">
                  
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
                        <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm text-center" required />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Motivo / Detalhes</label>
                    <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ex: Consulta médica, dor de dente..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-sm h-24 resize-none focus:border-purple-500 outline-none" required />
                  </div>

                  {/* UPLOAD DE ARQUIVO */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 border-dashed">
                    <label className="flex flex-col items-center gap-2 cursor-pointer">
                        <Upload size={24} className="text-slate-400" />
                        <span className="text-xs text-slate-400">{arquivo ? arquivo.name : 'Anexar Foto do Atestado'}</span>
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setArquivo(e.target.files?.[0] || null)} />
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setModalAberto(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg font-bold text-sm">Cancelar</button>
                    <button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold text-sm">
                        {loading ? 'Enviando...' : 'Enviar'}
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