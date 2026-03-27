'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Camera, Upload, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CadastrarFotoPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [cameraAtiva, setCameraAtiva] = useState(true);
  const [cameraErro, setCameraErro] = useState(false);

  // Redirects via useEffect (não pode chamar router.push durante render)
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      const user = session?.user as any;
      if (user?.impersonatedBy || user?.cargo === 'SUPER_ADMIN') {
        window.location.href = '/funcionario';
        return;
      }
      if (!user?.deveCadastrarFoto) {
        window.location.href = user?.deveDarCienciaCelular ? '/ciencia-celular' : '/funcionario';
      }
    }
  }, [status, session, router]);

  const tirarFoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setFotoBase64(imageSrc);
      setCameraAtiva(false);
    }
  }, []);

  const tirarNovamente = () => {
    setFotoBase64(null);
    setCameraAtiva(true);
    setErro('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErro('Selecione um arquivo de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErro('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoBase64(reader.result as string);
      setCameraAtiva(false);
      setErro('');
    };
    reader.readAsDataURL(file);
  };

  const confirmarESalvar = async () => {
    if (!fotoBase64) return;

    setLoading(true);
    setErro('');

    try {
      await axios.post('/api/auth/cadastrar-foto', { fotoBase64 });
      await update({ deveCadastrarFoto: false });
      // @ts-ignore
      if (session?.user?.deveDarCienciaCelular) {
        router.push('/ciencia-celular');
      } else {
        router.push('/funcionario');
      }
    } catch (error: any) {
      setErro(error.response?.data?.erro || 'Erro ao salvar foto. Tente novamente.');
      setLoading(false);
    }
  };

  if (status === 'loading') {
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
            <Camera size={32} className="text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Cadastro de Foto</h1>
          <p className="text-text-muted text-sm">
            Tire uma selfie ou envie uma foto para validação facial no ponto.
          </p>
        </div>

        {/* Webcam / Preview */}
        <div className="relative mb-6">
          {cameraAtiva && !fotoBase64 ? (
            <div className="rounded-2xl overflow-hidden border border-border-default bg-black aspect-[3/4] flex items-center justify-center">
              {cameraErro ? (
                <div className="text-center p-6">
                  <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
                  <p className="text-text-muted text-sm mb-4">Não foi possível acessar a câmera.</p>
                  <button
                    onClick={() => setCameraErro(false)}
                    className="text-purple-400 text-sm font-medium hover:underline"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.8}
                  videoConstraints={{ facingMode: 'user', width: 480, height: 640 }}
                  onUserMediaError={() => setCameraErro(true)}
                  className="w-full h-full object-cover"
                  mirrored
                />
              )}
            </div>
          ) : fotoBase64 ? (
            <div className="rounded-2xl overflow-hidden border border-purple-500/30 bg-black aspect-[3/4] flex items-center justify-center">
              <img
                src={fotoBase64}
                alt="Foto capturada"
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}
        </div>

        {/* Botões */}
        <div className="space-y-3">
          {!fotoBase64 ? (
            <>
              {/* Tirar Foto */}
              {!cameraErro && (
                <button
                  onClick={tirarFoto}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Camera size={20} />
                  Tirar Foto
                </button>
              )}

              {/* Upload da galeria */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-elevated-solid hover:bg-elevated-solid text-text-primary font-medium py-3 rounded-2xl transition-all flex items-center justify-center gap-2 border border-border-default"
              >
                <Upload size={18} />
                Enviar da Galeria
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          ) : (
            <>
              {/* Confirmar e Salvar */}
              <button
                onClick={confirmarESalvar}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Confirmar e Salvar
                  </>
                )}
              </button>

              {/* Tirar Novamente */}
              <button
                onClick={tirarNovamente}
                disabled={loading}
                className="w-full bg-elevated-solid hover:bg-elevated-solid text-text-primary font-medium py-3 rounded-2xl transition-all flex items-center justify-center gap-2 border border-border-default disabled:opacity-50"
              >
                <Camera size={18} />
                Tirar Novamente
              </button>
            </>
          )}
        </div>

        {/* Erro */}
        {erro && (
          <div className="mt-4 text-center text-sm text-red-300 bg-red-900/20 border border-red-500/20 rounded-xl p-3">
            {erro}
          </div>
        )}

        {/* Dica */}
        <p className="text-center text-[11px] text-text-faint mt-4">
          Dica: foto frontal, boa iluminação, sem óculos ou boné.
        </p>
      </div>
    </div>
  );
}
