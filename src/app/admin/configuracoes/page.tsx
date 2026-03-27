'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Save, Camera, Lock, UserCog, EyeOff, Settings } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';


// Página de Configurações da Empresa para Admins

export default function ConfiguracoesEmpresa() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

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
      toast.success('Configurações aplicadas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />
      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-8 space-y-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-hover-bg rounded-xl animate-pulse" />
          <div className="w-10 h-10 bg-hover-bg rounded-xl animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-56 bg-hover-bg rounded-lg animate-pulse" />
            <div className="h-4 w-40 bg-hover-bg rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-hover-bg rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Orbs decorativos */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-8 space-y-6 relative z-10">

        {/* CABEÇALHO */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95" title="Voltar">
              <ArrowLeft size={20} />
            </Link>
            <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
              <Settings size={24} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Configurações da Empresa</h1>
              <p className="text-text-muted text-sm">Personalize como o WorkID funciona para sua equipe.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">

          <div className="bg-surface backdrop-blur-sm p-5 rounded-2xl border border-border-subtle flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${configs.ocultarSaldoHoras ? 'bg-amber-900/30 text-amber-400' : 'bg-elevated-solid text-text-faint'}`}>
                <EyeOff size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Ocultar Banco de Horas</h3>
                <p className="text-xs text-text-muted max-w-sm">
                  O funcionário não verá o saldo de horas na tela inicial (apenas no holerite).
                </p>
              </div>
            </div>
            <button onClick={() => toggle('ocultarSaldoHoras')} className={`w-14 h-8 rounded-full p-1 transition-colors ${configs.ocultarSaldoHoras ? 'bg-purple-600' : 'bg-border-input'}`}>
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${configs.ocultarSaldoHoras ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div className="bg-surface backdrop-blur-sm p-5 rounded-2xl border border-border-subtle flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${configs.bloquearForaDoRaio ? 'bg-red-900/30 text-red-400' : 'bg-elevated-solid text-text-faint'}`}>
                <Lock size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Bloqueio Rigoroso de GPS</h3>
                <p className="text-xs text-text-muted max-w-sm">
                  {configs.bloquearForaDoRaio
                    ? "O funcionário é PROIBIDO de bater o ponto se estiver fora do raio."
                    : "O funcionário pode bater fora do raio, mas o sistema registrará como 'Fora do Local'."}
                </p>
              </div>
            </div>
            <button onClick={() => toggle('bloquearForaDoRaio')} className={`w-14 h-8 rounded-full p-1 transition-colors ${configs.bloquearForaDoRaio ? 'bg-purple-600' : 'bg-border-input'}`}>
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${configs.bloquearForaDoRaio ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div className="bg-surface backdrop-blur-sm p-5 rounded-2xl border border-border-subtle flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${configs.exigirFoto ? 'bg-blue-900/30 text-blue-400' : 'bg-elevated-solid text-text-faint'}`}>
                <Camera size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Exigir Foto no Ponto</h3>
                <p className="text-xs text-text-muted max-w-sm">
                  {configs.exigirFoto
                    ? "Obrigatório tirar selfie para registrar o ponto."
                    : "Apenas o GPS é necessário. O botão de foto ficará oculto."}
                </p>
              </div>
            </div>
            <button onClick={() => toggle('exigirFoto')} className={`w-14 h-8 rounded-full p-1 transition-colors ${configs.exigirFoto ? 'bg-purple-600' : 'bg-border-input'}`}>
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${configs.exigirFoto ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div className="bg-surface backdrop-blur-sm p-5 rounded-2xl border border-border-subtle flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${configs.permitirEdicaoFunc ? 'bg-emerald-900/30 text-emerald-400' : 'bg-elevated-solid text-text-faint'}`}>
                <UserCog size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Auto-Gestão</h3>
                <p className="text-xs text-text-muted max-w-sm">
                  Permitir que o funcionário edite seu próprio ponto (apenas se esqueceu).
                  <span className="block text-amber-400 mt-1">Recomendado: Desativado (Apenas Admin edita).</span>
                </p>
              </div>
            </div>
            <button onClick={() => toggle('permitirEdicaoFunc')} className={`w-14 h-8 rounded-full p-1 transition-colors ${configs.permitirEdicaoFunc ? 'bg-purple-600' : 'bg-border-input'}`}>
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${configs.permitirEdicaoFunc ? 'translate-x-6' : ''}`} />
            </button>
          </div>

        </div>

        <button onClick={salvar} disabled={salvando} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '250ms' }}>
          {salvando ? 'Salvando...' : <><Save size={20}/> Salvar Preferências</>}
        </button>

      </div>
    </div>
  );
}
