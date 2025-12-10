'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Trash2, Plus, ArrowLeft, DownloadCloud, Loader } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function GestaoFeriados() {
  const [feriados, setFeriados] = useState<any[]>([]);
  const [data, setData] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    const res = await axios.get('/api/admin/feriados');
    setFeriados(res.data);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !nome) return;
    setLoading(true);
    try {
      await axios.post('/api/admin/feriados', { data, nome });
      setData(''); setNome('');
      carregar();
    } catch (error) { alert('Erro ao salvar'); } 
    finally { setLoading(false); }
  };

  const importarAutomatico = async () => {
    const anoAtual = new Date().getFullYear();
    if(!confirm(`Deseja importar automaticamente os feriados nacionais de ${anoAtual} e ${anoAtual + 1}?`)) return;
    
    setImportando(true);
    try {
      // Importa ano atual
      await axios.post('/api/admin/feriados/importar', { ano: anoAtual });
      // Importa próximo ano (para garantir planejamento)
      const res = await axios.post('/api/admin/feriados/importar', { ano: anoAtual + 1 });
      
      alert(res.data.message || 'Feriados importados com sucesso!');
      carregar();
    } catch (error) {
      alert('Erro ao conectar com a Brasil API.');
    } finally {
      setImportando(false);
    }
  };

  const excluir = async (id: string) => {
    if(!confirm('Excluir este feriado?')) return;
    await axios.delete(`/api/admin/feriados?id=${id}`);
    carregar();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-purple-400" />
            <h1 className="text-2xl font-bold">Gestão de Feriados</h1>
          </div>
          <Link href="/admin" className="text-slate-400 hover:text-white flex gap-2 items-center"><ArrowLeft size={20}/> Voltar</Link>
        </div>

        {/* BOTÃO MÁGICO DE IMPORTAÇÃO */}
        <button 
            onClick={importarAutomatico}
            disabled={importando}
            className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mb-4"
        >
            {importando ? <Loader size={20} className="animate-spin"/> : <DownloadCloud size={20} />}
            {importando ? 'Buscando na Brasil API...' : 'Importar Feriados Nacionais Automaticamente'}
        </button>

        {/* Formulário Manual (Para feriados locais/municipais) */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
            <p className="text-xs text-slate-500 uppercase font-bold">Adicionar Feriado Local (Manual)</p>
            <form onSubmit={salvar} className="flex gap-3 items-end">
                <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Nome (ex: Aniversário da Cidade)</label>
                    <input value={nome} onChange={e=>setNome(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white" required />
                </div>
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Data</label>
                    <input type="date" value={data} onChange={e=>setData(e.target.value)} className="bg-slate-950 border border-slate-700 p-2 rounded text-white" required />
                </div>
                <button disabled={loading} className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-lg flex items-center gap-2 font-bold">
                    <Plus size={20} />
                </button>
            </form>
        </div>

        <div className="space-y-2">
          {feriados.map(f => (
            <div key={f.id} className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex justify-between items-center group hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-purple-900/50 text-purple-300 p-2 rounded font-bold text-sm text-center min-w-[60px] flex flex-col">
                  <span className="text-lg">{format(new Date(f.data), 'dd')}</span>
                  <span className="text-[10px] uppercase">{format(new Date(f.data), 'MMM')}</span>
                </div>
                <div>
                    <span className="font-bold text-lg block text-white">{f.nome}</span>
                    <span className="text-xs text-slate-500">{format(new Date(f.data), 'yyyy')}</span>
                </div>
              </div>
              <button onClick={() => excluir(f.id)} className="text-slate-500 hover:text-red-400 p-2 transition-colors"><Trash2 size={18} /></button>
            </div>
          ))}
          {feriados.length === 0 && <p className="text-center text-slate-500 py-4">Nenhum feriado cadastrado.</p>}
        </div>

      </div>
    </div>
  );
}