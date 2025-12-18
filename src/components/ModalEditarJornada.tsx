'use client';

import { useState } from 'react';
import axios from 'axios';
import { X, Save, Clock, Copy } from 'lucide-react';

interface ModalProps {
  usuario: any;
  aoFechar: () => void;
  aoSalvar: () => void;
}

const DIAS = [
  { chave: 'seg', label: 'Segunda-feira' },
  { chave: 'ter', label: 'Terça-feira' },
  { chave: 'qua', label: 'Quarta-feira' },
  { chave: 'qui', label: 'Quinta-feira' },
  { chave: 'sex', label: 'Sexta-feira' },
  { chave: 'sab', label: 'Sábado' },
  { chave: 'dom', label: 'Domingo' },
];

export default function ModalEditarJornada({ usuario, aoFechar, aoSalvar }: ModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Carrega a jornada existente ou cria uma vazia
  const [jornada, setJornada] = useState<any>(usuario.jornada || {
    seg: { e1: '08:00', s1: '12:00', e2: '13:15', s2: '18:00', ativo: true },
    ter: { e1: '08:00', s1: '12:00', e2: '13:15', s2: '18:00', ativo: true },
    qua: { e1: '08:00', s1: '12:00', e2: '13:15', s2: '18:00', ativo: true },
    qui: { e1: '08:00', s1: '12:00', e2: '13:15', s2: '18:00', ativo: true },
    sex: { e1: '08:00', s1: '12:00', e2: '13:15', s2: '18:00', ativo: true },
    sab: { e1: '', s1: '', e2: '', s2: '', ativo: false },
    dom: { e1: '', s1: '', e2: '', s2: '', ativo: false },
  });

  const handleChange = (dia: string, campo: string, valor: string) => {
    setJornada((prev: any) => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor }
    }));
  };

  const toggleDia = (dia: string) => {
    setJornada((prev: any) => ({
      ...prev,
      [dia]: { ...prev[dia], ativo: !prev[dia].ativo }
    }));
  };

  // --- MÁGICA: PRESETS PARA O SEU PROBLEMA ---
  const aplicarPreset = (tipo: 'COM_SABADO' | 'SEM_SABADO') => {
    if (tipo === 'COM_SABADO') {
        // Segunda a Sexta com 2h de almoço + Sábado trabalhado
        const padrao2h = { e1: '08:00', s1: '12:00', e2: '14:00', s2: '18:00', ativo: true };
        const sabado = { e1: '08:00', s1: '12:00', e2: '', s2: '', ativo: true };
        setJornada({
            seg: padrao2h, ter: padrao2h, qua: padrao2h, qui: padrao2h, sex: padrao2h,
            sab: sabado,
            dom: { ...jornada.dom, ativo: false }
        });
    } else {
        // Segunda a Sexta com 1h15 de almoço + Sábado livre
        const padrao1h15 = { e1: '08:00', s1: '12:00', e2: '13:15', s2: '18:00', ativo: true };
        setJornada({
            seg: padrao1h15, ter: padrao1h15, qua: padrao1h15, qui: padrao1h15, sex: padrao1h15,
            sab: { ...jornada.sab, ativo: false },
            dom: { ...jornada.dom, ativo: false }
        });
    }
  };

  const salvar = async () => {
    setLoading(true);
    try {
        await axios.put('/api/admin/usuario/jornada', {
            usuarioId: usuario.id,
            jornada
        });
        alert('Escala atualizada com sucesso!');
        aoSalvar();
        aoFechar();
    } catch (error) {
        alert('Erro ao salvar escala.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
            <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clock className="text-purple-400" /> Configurar Escala
                </h3>
                <p className="text-slate-400 text-sm">Funcionário: <span className="text-white font-bold">{usuario.nome}</span></p>
            </div>
            <button onClick={aoFechar} className="text-slate-500 hover:text-white"><X size={24}/></button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Botões de Atalho (Resolver o seu problema) */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 font-bold uppercase mb-3 flex items-center gap-2"><Copy size={12}/> Modelos Rápidos</p>
                <div className="flex gap-3">
                    <button onClick={() => aplicarPreset('SEM_SABADO')} className="flex-1 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 text-blue-200 py-2 rounded text-xs font-bold transition-all">
                        Sem Sábado (1h15 Almoço)
                    </button>
                    <button onClick={() => aplicarPreset('COM_SABADO')} className="flex-1 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800 text-purple-200 py-2 rounded text-xs font-bold transition-all">
                        Com Sábado (2h Almoço)
                    </button>
                </div>
            </div>

            {/* Lista de Dias */}
            <div className="space-y-2">
                {DIAS.map((dia) => (
                    <div key={dia.chave} className={`grid grid-cols-12 gap-2 items-center p-3 rounded-lg border ${jornada[dia.chave]?.ativo ? 'bg-slate-800 border-slate-700' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
                        <div className="col-span-3 flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={jornada[dia.chave]?.ativo} 
                                onChange={() => toggleDia(dia.chave)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600"
                            />
                            <span className="text-sm font-bold text-slate-300">{dia.label}</span>
                        </div>
                        
                        {jornada[dia.chave]?.ativo ? (
                            <div className="col-span-9 grid grid-cols-4 gap-2">
                                <div><label className="text-[10px] text-slate-500 block">Entrada</label><input type="time" value={jornada[dia.chave].e1} onChange={e=>handleChange(dia.chave, 'e1', e.target.value)} className="w-full bg-slate-950 border border-slate-600 rounded p-1 text-white text-xs text-center"/></div>
                                <div><label className="text-[10px] text-slate-500 block">Saída Almoço</label><input type="time" value={jornada[dia.chave].s1} onChange={e=>handleChange(dia.chave, 's1', e.target.value)} className="w-full bg-slate-950 border border-slate-600 rounded p-1 text-white text-xs text-center"/></div>
                                <div><label className="text-[10px] text-slate-500 block">Volta Almoço</label><input type="time" value={jornada[dia.chave].e2} onChange={e=>handleChange(dia.chave, 'e2', e.target.value)} className="w-full bg-slate-950 border border-slate-600 rounded p-1 text-white text-xs text-center"/></div>
                                <div><label className="text-[10px] text-slate-500 block">Saída</label><input type="time" value={jornada[dia.chave].s2} onChange={e=>handleChange(dia.chave, 's2', e.target.value)} className="w-full bg-slate-950 border border-slate-600 rounded p-1 text-white text-xs text-center"/></div>
                            </div>
                        ) : (
                            <div className="col-span-9 text-xs text-slate-600 italic text-center py-2">Dia de folga / Livre</div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
            <button onClick={aoFechar} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold transition-colors">Cancelar</button>
            <button onClick={salvar} disabled={loading} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg shadow-green-900/20 transition-all">
                {loading ? 'Salvando...' : <><Save size={18}/> Salvar Alterações</>}
            </button>
        </div>

      </div>
    </div>
  );
}