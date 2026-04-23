'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, FileText, X, ChevronRight } from 'lucide-react';
import axios from 'axios';

export default function BannerNovidades() {
  const router = useRouter();
  const [comunicadosNaoLidos, setComunicadosNaoLidos] = useState(0);
  const [contrachequesNovos, setContrachequesNovos] = useState(0);
  const [dismissedComunicados, setDismissedComunicados] = useState(false);
  const [dismissedContracheques, setDismissedContracheques] = useState(false);

  useEffect(() => {
    // Verificar se já dismissou nesta sessão
    if (sessionStorage.getItem('banner_comunicados_dismissed')) setDismissedComunicados(true);
    if (sessionStorage.getItem('banner_contracheques_dismissed')) setDismissedContracheques(true);

    // Buscar comunicados não lidos
    axios.get('/api/funcionario/comunicados')
      .then(res => {
        const naoLidos = Array.isArray(res.data) ? res.data.filter((c: any) => !c.lido).length : 0;
        setComunicadosNaoLidos(naoLidos);
      })
      .catch(() => {});

    // Buscar contracheques não visualizados
    axios.get('/api/funcionario/contracheques')
      .then(res => {
        const novos = Array.isArray(res.data) ? res.data.filter((c: any) => !c.visualizado).length : 0;
        setContrachequesNovos(novos);
      })
      .catch(() => {});
  }, []);

  const dismissComunicados = () => {
    setDismissedComunicados(true);
    sessionStorage.setItem('banner_comunicados_dismissed', '1');
  };

  const dismissContracheques = () => {
    setDismissedContracheques(true);
    sessionStorage.setItem('banner_contracheques_dismissed', '1');
  };

  return (
    <>
      {/* Banner Comunicados */}
      {comunicadosNaoLidos > 0 && !dismissedComunicados && (
        <div className="mx-4 mb-3 animate-in slide-in-from-top-4 fade-in duration-500">
          <div className="bg-purple-600/20 border border-purple-500/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-xl shrink-0">
              <Megaphone size={20} className="text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary">
                {comunicadosNaoLidos === 1 ? 'Novo comunicado!' : `${comunicadosNaoLidos} comunicados novos!`}
              </p>
              <p className="text-xs text-text-muted mt-0.5">Toque para ler</p>
            </div>
            <button
              onClick={() => { dismissComunicados(); router.push('/funcionario/comunicados'); }}
              className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 flex items-center gap-1"
            >
              Ver <ChevronRight size={14} />
            </button>
            <button onClick={dismissComunicados} className="text-text-dim hover:text-text-primary p-1 shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Banner Contracheques */}
      {contrachequesNovos > 0 && !dismissedContracheques && (
        <div className="mx-4 mb-3 animate-in slide-in-from-top-4 fade-in duration-500" style={{ animationDelay: '200ms' }}>
          <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2 rounded-xl shrink-0">
              <FileText size={20} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary">
                {contrachequesNovos === 1 ? 'Novo contracheque disponível!' : `${contrachequesNovos} contracheques novos!`}
              </p>
              <p className="text-xs text-text-muted mt-0.5">Abra e assine para confirmar</p>
            </div>
            <button
              onClick={() => { dismissContracheques(); router.push('/funcionario/contracheques'); }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 flex items-center gap-1"
            >
              Ver <ChevronRight size={14} />
            </button>
            <button onClick={dismissContracheques} className="text-text-dim hover:text-text-primary p-1 shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
