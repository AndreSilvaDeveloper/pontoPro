'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ArrowLeft, ShieldCheck, Search, FileText } from 'lucide-react';
import Link from 'next/link';

export default function LogsAuditoria() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // API Inline para buscar logs (pode separar se quiser, mas aqui é mais rápido)
    const fetchLogs = async () => {
        try {
            const res = await axios.get('/api/admin/logs');
            setLogs(res.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchLogs();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3">
                <ShieldCheck className="text-green-400" size={32} />
                <div>
                    <h1 className="text-2xl font-bold">Auditoria do Sistema</h1>
                    <p className="text-slate-400 text-sm">Rastreamento de ações administrativas</p>
                </div>
            </div>
            <Link href="/admin" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition flex items-center gap-2"><ArrowLeft size={18}/> Voltar</Link>
        </div>

        {loading ? <p className="text-slate-500">Carregando auditoria...</p> : (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-slate-200 uppercase font-bold text-xs">
                        <tr>
                            <th className="p-4">Data/Hora</th>
                            <th className="p-4">Responsável</th>
                            <th className="p-4">Ação</th>
                            <th className="p-4">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {logs.length > 0 ? logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-800/50 transition">
                                <td className="p-4 whitespace-nowrap font-mono text-xs">{format(new Date(log.dataHora), 'dd/MM/yy HH:mm')}</td>
                                <td className="p-4 text-white font-bold">{log.adminNome}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${log.acao.includes('FERIAS') ? 'bg-blue-900/30 text-blue-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                                        {log.acao.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-300">{log.detalhes}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-600">Nenhum registro encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}