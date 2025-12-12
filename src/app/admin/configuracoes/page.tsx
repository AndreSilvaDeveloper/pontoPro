'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Save, Shield, Camera, Lock, UserCog, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function ConfiguracoesEmpresa() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Nossas Flags de Personalização
  const [configs, setConfigs] = useState({
    bloquearForaDoRaio: true,
    exigirFoto: true,
    permitirEdicaoFunc: false,
    ocultarSaldoHoras: false,
    modoEstrito: false      
  });

  useEffect(() => {
    axios.get('/api/admin/empresa').then(res => {
        if(res.data.configuracoes) setConfigs(res.data.configuracoes);
        setLoading(false);
    });
  }, []);

  const toggle = (campo: keyof typeof configs) => {
      setConfigs(prev => ({ ...prev, [campo]: !prev[campo] }));
  };

  const salvar = async () => {
      setSalvando(true);
      try {
          await axios.put('/api/admin/empresa', configs);
          alert('Configurações aplicadas com sucesso!');
      } catch (error) {
          alert('Erro ao salvar.');
      } finally {
          setSalvando(false);
      }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
            <div>
                <h1 className="text-2xl font-bold">Configurações da Empresa</h1>
                <p className="text-slate-400 text-sm">Personalize como o WorkID funciona para sua equipe.</p>
            </div>
            <Link href="/admin" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition flex items-center gap-2"><ArrowLeft size={18}/> Voltar</Link>
        </div>

        <div className="space-y-4">


            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
    <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${configs.ocultarSaldoHoras ? 'bg-yellow-900/30 text-yellow-400' : 'bg-slate-800 text-slate-500'}`}>
            <EyeOff size={24} /> {/* Importe EyeOff do lucide-react */}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Ocultar Banco de Horas</h3>
                        <p className="text-xs text-slate-400 max-w-sm">
                            O funcionário não verá o saldo de horas na tela inicial (apenas no holerite).
                        </p>
                    </div>
                </div>
                <button onClick={() => toggle('ocultarSaldoHoras')} className={`w-14 h-8 rounded-full p-1 transition-colors ${configs.ocultarSaldoHoras ? 'bg-purple-600' : 'bg-slate-700'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${configs.ocultarSaldoHoras ? 'translate-x-6' : ''}`} />
                </button>
            </div>
            
            {/* ITEM 1: BLOQUEIO DE GPS */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${configs.bloquearForaDoRaio ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Lock size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Bloqueio Rigoroso de GPS</h3>
                        <p className="text-xs text-slate-400 max-w-sm">
                            {configs.bloquearForaDoRaio 
                                ? "O funcionário é PROIBIDO de bater o ponto se estiver fora do raio." 
                                : "O funcionário pode bater fora do raio, mas o sistema registrará como 'Fora do Local'."}
                        </p>
                    </div>
                </div>
                <button onClick={() => toggle('bloquearForaDoRaio')} className={`w-14 h-8 rounded-full p-1 transition-colors ${configs.bloquearForaDoRaio ? 'bg-purple-600' : 'bg-slate-700'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${configs.bloquearForaDoRaio ? 'translate-x-6' : ''}`} />
                </button>
            </div>

            {/* ITEM 2: EXIGIR FOTO */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${configs.exigirFoto ? 'bg-blue-900/30 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Camera size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Exigir Foto no Ponto</h3>
                        <p className="text-xs text-slate-400 max-w-sm">
                            {configs.exigirFoto 
                                ? "Obrigatório tirar selfie para registrar o ponto." 
                                : "Apenas o GPS é necessário. O botão de foto ficará oculto."}
                        </p>
                    </div>
                </div>
                <button onClick={() => toggle('exigirFoto')} className={`w-14 h-8 rounded-full p-1 transition-colors ${configs.exigirFoto ? 'bg-purple-600' : 'bg-slate-700'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${configs.exigirFoto ? 'translate-x-6' : ''}`} />
                </button>
            </div>

            {/* ITEM 3: PERMISSÃO DE EDIÇÃO */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${configs.permitirEdicaoFunc ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                        <UserCog size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Auto-Gestão</h3>
                        <p className="text-xs text-slate-400 max-w-sm">
                            Permitir que o funcionário edite seu próprio ponto (apenas se esqueceu).
                            <span className="block text-yellow-500 mt-1">Recomendado: Desativado (Apenas Admin edita).</span>
                        </p>
                    </div>
                </div>
                <button onClick={() => toggle('permitirEdicaoFunc')} className={`w-14 h-8 rounded-full p-1 transition-colors ${configs.permitirEdicaoFunc ? 'bg-purple-600' : 'bg-slate-700'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${configs.permitirEdicaoFunc ? 'translate-x-6' : ''}`} />
                </button>
            </div>

        </div>

        <button onClick={salvar} disabled={salvando} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20">
            {salvando ? 'Salvando...' : <><Save size={20}/> Salvar Preferências</>}
        </button>

      </div>
    </div>
  );
}