'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas'; // A biblioteca mágica
import { ArrowLeft, Save, Trash2, PenTool, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AssinaturaDigital() {
  const [loading, setLoading] = useState(false);
  const [assinaturaExistente, setAssinaturaExistente] = useState<string | null>(null);
  const sigCanvas = useRef<any>({});

  useEffect(() => {
    // Verifica se já tem assinatura salva
    axios.get('/api/funcionario/assinatura').then(res => {
        if(res.data.url) setAssinaturaExistente(res.data.url);
    });
  }, []);

  const limpar = () => sigCanvas.current.clear();

  const salvar = async () => {
    if (sigCanvas.current.isEmpty()) {
        alert("Por favor, assine antes de salvar.");
        return;
    }

    setLoading(true);
    try {
        // 1. Converte o desenho para imagem (Blob)
        const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        const blob = await (await fetch(dataURL)).blob();
        const file = new File([blob], "assinatura.png", { type: "image/png" });

        // 2. Envia para a API
        const formData = new FormData();
        formData.append('assinatura', file);

        const res = await axios.post('/api/funcionario/assinatura', formData);
        setAssinaturaExistente(res.data.url);
        alert("Assinatura salva com sucesso!");
        
    } catch (error) {
        alert("Erro ao salvar assinatura.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <PenTool className="text-purple-400" />
          <h1 className="text-xl font-bold">Assinatura Digital</h1>
        </div>
        <Link href="/funcionario" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"><ArrowLeft size={20} /></Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        
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
            <div className="bg-white rounded-xl p-4 w-full max-w-md flex flex-col items-center gap-4">
                <img src={assinaturaExistente} alt="Minha Assinatura" className="h-32 object-contain" />
                <div className="w-full h-px bg-slate-200"></div>
                <div className="flex gap-2 w-full">
                    <button 
                        onClick={() => setAssinaturaExistente(null)} 
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18} /> Trocar Assinatura
                    </button>
                    <div className="flex-1 bg-green-100 text-green-700 py-3 rounded-lg font-bold flex items-center justify-center gap-2 border border-green-200">
                        <CheckCircle size={18} /> Salva
                    </div>
                </div>
            </div>
        ) : (
            /* SE NÃO TIVER, MOSTRA O CANVAS PARA DESENHAR */
            <div className="w-full max-w-md space-y-4">
                <div className="bg-white rounded-2xl overflow-hidden border-4 border-slate-700 touch-none shadow-2xl">
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
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <Trash2 size={20} /> Limpar
                    </button>
                    <button 
                        onClick={salvar} 
                        disabled={loading}
                        className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
                    >
                        {loading ? 'Salvando...' : <><Save size={20} /> Salvar Assinatura</>}
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}