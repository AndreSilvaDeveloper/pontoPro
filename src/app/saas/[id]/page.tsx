'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Save, Plus, Trash2, ShieldCheck, Database } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ConfigEmpresaPage() {
  const router = useRouter();
  const params = useParams(); 
  const idEmpresa = params.id as string;

  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [padrao, setPadrao] = useState({
    bloquearForaDoRaio: true, exigirFoto: true, ocultarSaldoHoras: false
  });

  const [custom, setCustom] = useState<{ chave: string; valor: string }[]>([]);
  const [novaChave, setNovaChave] = useState('');
  const [novoValor, setNovoValor] = useState('');

  useEffect(() => {
    if (idEmpresa) carregar();
  }, [idEmpresa]);

  const carregar = async () => {
    try {
        const res = await axios.get(`/api/saas/empresa/${idEmpresa}`);
        setEmpresa(res.data);
        
        const configsDoBanco = res.data.configuracoes || {};
        const { bloquearForaDoRaio, exigirFoto, ocultarSaldoHoras, ...restante } = configsDoBanco;
        
        setPadrao({
            bloquearForaDoRaio: !!bloquearForaDoRaio,
            exigirFoto: !!exigirFoto,
            ocultarSaldoHoras: !!ocultarSaldoHoras
        });

        const arrayCustom = Object.entries(restante).map(([k, v]) => ({ chave: k, valor: String(v) }));
        setCustom(arrayCustom);

    } catch (error) { 
        console.error(error); alert('Erro ao carregar'); 
    } finally { setLoading(false); }
  };

  const togglePadrao = (key: keyof typeof padrao) => {
      setPadrao(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addCustom = () => {
      if (!novaChave || !novoValor) return;
      setCustom([...custom, { chave: novaChave, valor: novoValor }]);
      setNovaChave(''); setNovoValor('');
  };

  const removeCustom = (index: number) => {
      const novo = [...custom];
      novo.splice(index, 1);
      setCustom(novo);
  };

  const salvarTudo = async () => {
      const jsonFinal: any = { ...padrao };
      custom.forEach(item => {
          let val: any = item.valor;
          if (val === 'true') val = true; else if (val === 'false') val = false; else if (!isNaN(Number(val))) val = Number(val);
          jsonFinal[item.chave] = val;
      });

      try {
          await axios.put(`/api/saas/empresa/${idEmpresa}`, { novasConfigs: jsonFinal });
          alert('Configurações salvas!');
      } catch (error) { alert('Erro ao salvar'); }
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-gray-800 pb-6">
            <div><h1 className="text-2xl font-bold text-purple-500">{empresa?.nome || 'Carregando...'}</h1><p className="text-gray-400 text-sm">ID: {idEmpresa}</p></div>
            <Link href="/saas" className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm"><ArrowLeft size={16}/> Voltar</Link>
        </div>

        {/* PADRÕES */}
        <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-blue-400"><ShieldCheck/> Padrões do Sistema</h2>
            <div className="grid gap-3">
                <div className="flex items-center justify-between bg-gray-900 p-4 rounded-xl border border-gray-800"><div><p className="font-bold">Bloqueio de GPS</p><p className="text-xs text-gray-500">Impede ponto fora do raio.</p></div><input type="checkbox" checked={padrao.bloquearForaDoRaio} onChange={() => togglePadrao('bloquearForaDoRaio')} className="w-6 h-6 accent-purple-600 cursor-pointer"/></div>
                <div className="flex items-center justify-between bg-gray-900 p-4 rounded-xl border border-gray-800"><div><p className="font-bold">Exigir Foto</p><p className="text-xs text-gray-500">Obrigatório selfie.</p></div><input type="checkbox" checked={padrao.exigirFoto} onChange={() => togglePadrao('exigirFoto')} className="w-6 h-6 accent-purple-600 cursor-pointer"/></div>
                <div className="flex items-center justify-between bg-gray-900 p-4 rounded-xl border border-gray-800"><div><p className="font-bold">Ocultar Saldo</p><p className="text-xs text-gray-500">Funcionário não vê banco.</p></div><input type="checkbox" checked={padrao.ocultarSaldoHoras} onChange={() => togglePadrao('ocultarSaldoHoras')} className="w-6 h-6 accent-purple-600 cursor-pointer"/></div>
            </div>
        </div>

        {/* CUSTOMIZADOS */}
        <div className="space-y-4 pt-6 border-t border-gray-800">
            <h2 className="text-lg font-bold flex items-center gap-2 text-green-400"><Database/> Personalização Extra</h2>
            <div className="space-y-2">
                {custom.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-900 p-3 rounded-lg border border-gray-800"><span className="font-mono text-purple-400 text-sm flex-1">{item.chave}</span><span className="font-mono text-white text-sm flex-1">= {item.valor}</span><button onClick={() => removeCustom(idx)} className="text-red-500 hover:text-red-400"><Trash2 size={18}/></button></div>
                ))}
            </div>
            <div className="flex gap-2 bg-gray-900 p-3 rounded-lg border border-gray-700">
                <input placeholder="Chave (ex: limite_usuarios)" value={novaChave} onChange={e=>setNovaChave(e.target.value)} className="bg-black border border-gray-600 p-2 rounded text-sm text-white flex-1"/>
                <input placeholder="Valor (ex: 10)" value={novoValor} onChange={e=>setNovoValor(e.target.value)} className="bg-black border border-gray-600 p-2 rounded text-sm text-white flex-1"/>
                <button onClick={addCustom} className="bg-green-600 hover:bg-green-700 text-white px-4 rounded font-bold"><Plus size={18}/></button>
            </div>
        </div>

        <div className="pt-6"><button onClick={salvarTudo} className="w-full bg-purple-600 hover:bg-purple-700 py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"><Save size={20} /> Salvar Configurações</button></div>
      </div>
    </div>
  );
}