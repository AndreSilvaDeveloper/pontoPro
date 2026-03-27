'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, Save, Trash2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CadastrarAssinaturaPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const sigCanvas = useRef<any>({});

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated') {
      fetch('/api/auth/session')
        .then(r => r.json())
        .then(s => {
          const user = s?.user;
          if (!user) return;
          // Impersonate, SUPER_ADMIN, ou já tem assinatura: sai daqui
          if (user.impersonatedBy || user.cargo === 'SUPER_ADMIN' || user.temAssinatura) {
            const dest = user.cargo === 'ADMIN' ? '/admin' : '/funcionario';
            window.location.href = dest; // Hard redirect para quebrar qualquer loop
            return;
          }
          setShouldShow(true);
        })
        .catch(() => setShouldShow(true));
    }
  }, [status, router]);

  const limpar = () => {
    sigCanvas.current.clear();
    setErro('');
  };

  const salvar = async () => {
    if (sigCanvas.current.isEmpty()) {
      setErro('Desenhe sua assinatura antes de salvar.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      const blob = await (await fetch(dataURL)).blob();
      const file = new File([blob], 'assinatura.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('assinatura', file);

      await axios.post('/api/funcionario/assinatura', formData);
      await update({ temAssinatura: true });

      setSucesso(true);
      setTimeout(() => {
        if (session?.user?.deveCadastrarFoto) {
          router.push('/cadastrar-foto');
        } else if (session?.user?.deveDarCienciaCelular) {
          router.push('/ciencia-celular');
        } else {
          router.push('/funcionario');
        }
      }, 1500);
    } catch (error: any) {
      setErro(error.response?.data?.erro || 'Erro ao salvar assinatura.');
      setLoading(false);
    }
  };

  if (status === 'loading' || !shouldShow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <RefreshCw className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <div className="w-full max-w-md bg-surface-solid/80 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-purple-500/20 shadow-2xl shadow-purple-900/10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mb-4 border border-purple-500/20">
            <PenTool size={32} className="text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Assinatura Digital</h1>
          <p className="text-text-muted text-sm">
            Cadastre sua assinatura para validar seus espelhos de ponto.
          </p>
          <p className="text-purple-400/80 text-xs mt-2 font-medium">
            Este passo é obrigatório para continuar.
          </p>
        </div>

        {sucesso ? (
          <div className="text-center py-10 animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <p className="text-text-primary font-bold text-lg">Assinatura salva!</p>
            <p className="text-text-muted text-sm mt-1">Redirecionando...</p>
          </div>
        ) : (
          <>
            {/* Instrução */}
            <p className="text-center text-text-secondary text-sm mb-4">
              Desenhe sua assinatura no quadro abaixo:
            </p>

            {/* Canvas */}
            <div className="bg-white rounded-2xl overflow-hidden border-2 border-purple-500/30 ring-1 ring-purple-500/20 touch-none shadow-2xl mb-4">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                backgroundColor="white"
                canvasProps={{
                  className: 'w-full h-64 cursor-crosshair'
                }}
              />
              <div className="bg-slate-200 text-text-faint text-[10px] text-center py-1 border-t border-border-input">
                Assine aqui
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div className="mb-4 text-center text-sm text-red-300 bg-red-900/20 border border-red-500/20 rounded-xl p-3 flex items-center justify-center gap-2">
                <AlertCircle size={16} />
                {erro}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={limpar}
                disabled={loading}
                className="flex-1 bg-elevated-solid hover:bg-elevated-solid text-text-secondary py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border border-border-default transition-colors active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={20} /> Limpar
              </button>
              <button
                onClick={salvar}
                disabled={loading}
                className="flex-[2] bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={20} /> Salvar Assinatura
                  </>
                )}
              </button>
            </div>

            {/* Dica */}
            <p className="text-center text-[11px] text-text-faint mt-4">
              Dica: use o dedo ou uma caneta stylus para melhor precisão.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
