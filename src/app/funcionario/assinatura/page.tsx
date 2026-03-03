'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import { Save, Trash2, PenTool, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AssinaturaDigital() {
  const [loading, setLoading] = useState(false);
  const [assinaturaExistente, setAssinaturaExistente] = useState<string | null>(null);
  const sigCanvas = useRef<any>({});

  useEffect(() => {
    axios.get('/api/funcionario/assinatura').then(res => {
        if(res.data.url) setAssinaturaExistente(res.data.url);
    });
  }, []);

  const limpar = () => sigCanvas.current.clear();

  const salvar = async () => {
    if (sigCanvas.current.isEmpty()) {
        toast.error("Por favor, assine antes de salvar.");
        return;
    }

    setLoading(true);
    try {
        const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        const blob = await (await fetch(dataURL)).blob();
        const file = new File([blob], "assinatura.png", { type: "image/png" });

        const formData = new FormData();
        formData.append('assinatura', file);

        const res = await axios.post('/api/funcionario/assinatura', formData);
        setAssinaturaExistente(res.data.url);
        toast.success("Assinatura salva com sucesso!");

    } catch (error) {
        toast.error("Erro ao salvar assinatura.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Blurs decorativos */}
      <div className="fixed top-[-10%] right-[-10%] w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-md mx-auto w-full p-4 pb-24 flex flex-col flex-1 relative z-10">

        {/* CABEÇALHO glassmórfico */}
        <div className="flex items-center gap-3 pt-2 pb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white/5 p-2 rounded-xl border border-white/10">
            <PenTool className="text-purple-400" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">Assinatura Digital</h1>
            <p className="text-xs text-slate-400 mt-1">Valida seus espelhos de ponto</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

          <div className="text-center space-y-2">
              <p className="text-slate-300">
                  {assinaturaExistente ? "Sua assinatura atual:" : "Desenhe sua assinatura abaixo:"}
              </p>
              <p className="text-xs text-slate-500">
                  Esta assinatura será usada para validar seus espelhos de ponto.
              </p>
          </div>

          {/* SE JÁ TIVER ASSINATURA, MOSTRA ELA */}
          {assinaturaExistente ? (
              <div className="bg-white rounded-2xl p-4 w-full max-w-md flex flex-col items-center gap-4 shadow-2xl">
                  <img src={assinaturaExistente} alt="Minha Assinatura" className="h-32 object-contain" />
                  <div className="w-full h-px bg-slate-200"></div>
                  <div className="flex gap-2 w-full">
                      <button
                          onClick={() => setAssinaturaExistente(null)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                      >
                          <Trash2 size={18} /> Trocar
                      </button>
                      <div className="flex-1 bg-green-100 text-green-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-green-200">
                          <CheckCircle size={18} /> Salva
                      </div>
                  </div>
              </div>
          ) : (
              <div className="w-full max-w-md space-y-4">
                  <div className="bg-white rounded-2xl overflow-hidden border-2 border-purple-500/30 ring-1 ring-purple-500/20 touch-none shadow-2xl">
                      <SignatureCanvas
                          ref={sigCanvas}
                          penColor="black"
                          backgroundColor="white"
                          canvasProps={{
                              className: 'w-full h-64 cursor-crosshair'
                          }}
                      />
                      <div className="bg-slate-200 text-slate-500 text-[10px] text-center py-1 border-t border-slate-300">
                          Área de Assinatura
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button
                          onClick={limpar}
                          className="flex-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border border-white/5 transition-colors active:scale-95"
                      >
                          <Trash2 size={20} /> Limpar
                      </button>
                      <button
                          onClick={salvar}
                          disabled={loading}
                          className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                          {loading ? 'Salvando...' : <><Save size={20} /> Salvar Assinatura</>}
                      </button>
                  </div>
              </div>
          )}

        </div>
      </div>
    </div>
  );
}
