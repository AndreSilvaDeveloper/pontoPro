'use client';

import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { MapPin, Camera, LogOut, LayoutDashboard, AlertCircle, History, Settings, RefreshCcw, FileText } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardGraficos from '@/components/DashboardGraficos';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tipoPonto, setTipoPonto] = useState('ENTRADA'); 
  const [cameraErro, setCameraErro] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } 
    else if (status === 'authenticated') {
      // @ts-ignore
      if (session?.user?.deveTrocarSenha) {
        router.push('/trocar-senha');
        return;
      }
      if (session?.user?.cargo === 'ADMIN') {
        router.push('/admin');
      }
    }
  }, [status, router, session]);

  // Função para tentar destravar a câmera se o usuário bloqueou
  const tentarRecuperarCamera = async () => {
    setCameraErro(false);
    setStatusMsg({ tipo: 'info', texto: 'Tentando ativar câmera...' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setStatusMsg(null);
    } catch (err) {
      setCameraErro(true);
      setStatusMsg({ tipo: 'erro', texto: 'O acesso continua bloqueado pelo celular.' });
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Carregando...</div>;
  }

  const capturarLocalizacao = () => {
    setStatusMsg({ tipo: 'info', texto: 'Obtendo GPS...' });
    if (!navigator.geolocation) {
      setStatusMsg({ tipo: 'erro', texto: 'Seu navegador não suporta GPS.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatusMsg({ tipo: 'sucesso', texto: 'Localização ok!' });
      },
      (error) => setStatusMsg({ tipo: 'erro', texto: 'Erro no GPS: ' + error.message })
    );
  };

  const baterPonto = async () => {
    if (!location) {
      setStatusMsg({ tipo: 'erro', texto: 'Preciso da localização!' });
      return;
    }

    const imageSrc = webcamRef.current?.getScreenshot();

    if (!imageSrc) {
      setCameraErro(true);
      setStatusMsg({ 
        tipo: 'erro', 
        texto: '🚫 Câmera bloqueada! Libere o acesso para continuar.' 
      });
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/bater-ponto', {
        // @ts-ignore
        usuarioId: session?.user?.id, 
        latitude: location.lat,
        longitude: location.lng,
        fotoBase64: imageSrc,
        tipo: tipoPonto 
      });
      setStatusMsg({ tipo: 'sucesso', texto: `✅ ${response.data.mensagem}` });
    } catch (error: any) {
      const msg = error.response?.data?.erro || 'Erro ao registrar';
      setStatusMsg({ tipo: 'erro', texto: `❌ ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-900 text-white">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
        
        {/* Cabeçalho */}
        <div className="p-4 flex justify-between items-center border-b border-slate-700 bg-slate-950">
          <div>
            <h1 className="font-bold text-purple-400">Olá, {session?.user?.name}</h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-bold border border-slate-700">
              {session?.user?.cargo}
            </span>
          </div>
          <div className="flex gap-2">
            
            {session?.user?.cargo === 'ADMIN' && (
              <Link href="/admin" className="p-2 text-purple-400 hover:text-purple-300 transition-colors">
                <LayoutDashboard size={20} />
              </Link>
            )}

            <Link 
              href="/funcionario/ausencias" 
              className="p-2 text-yellow-500 hover:text-yellow-400 transition-colors"
              title="Justificar Ausência"
            >
              <FileText size={20} /> {/* Importe FileText de lucide-react */}
            </Link>

            

            <Link 
              href="/funcionario/historico" 
              className="p-2 text-green-400 hover:text-green-300 transition-colors"
              title="Meu Histórico"
            >
              <History size={20} />
            </Link>

         
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Câmera */}
        <div className="p-6 space-y-6">
          <div className={`relative rounded-xl overflow-hidden border-2 bg-black aspect-video ${cameraErro ? 'border-red-500 shadow-red-900/50 shadow-lg' : 'border-slate-600'}`}>
            
            {!cameraErro && (
                <Webcam 
                audio={false} 
                ref={webcamRef} 
                screenshotFormat="image/jpeg" 
                className="w-full h-full object-cover"
                onUserMediaError={() => setCameraErro(true)}
                onUserMedia={() => setCameraErro(false)}
                />
            )}
            
            {/* TELA DE ERRO / RECUPERAÇÃO */}
            {cameraErro && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-center p-4 z-10">
                <AlertCircle size={40} className="text-red-500 mb-2" />
                <p className="text-red-400 font-bold mb-1">Câmera Bloqueada</p>
                <p className="text-xs text-gray-400 mb-4">O app precisa da câmera para validar seu ponto.</p>
                
                <button 
                    onClick={tentarRecuperarCamera}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 mb-3 w-full justify-center transition-colors"
                >
                    <RefreshCcw size={14} /> Tentar Ativar Agora
                </button>

                <div className="bg-slate-800 p-2 rounded border border-slate-700 w-full text-left">
                    <p className="text-[10px] text-slate-300 font-bold mb-1 flex items-center gap-1"><Settings size={10}/> SE NÃO FUNCIONAR:</p>
                    <ol className="text-[10px] text-slate-400 list-decimal pl-4 space-y-1">
                        <li>Abra as <strong>Configurações</strong> do celular.</li>
                        <li>Vá em <strong>Aplicativos</strong> {'>'} <strong>WorkID</strong>.</li>
                        <li>Clique em <strong>Permissões</strong>.</li>
                        <li>Ative a <strong>Câmera</strong>.</li>
                    </ol>
                </div>
              </div>
            )}
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-lg text-sm text-center font-bold ${statusMsg.tipo === 'erro' ? 'bg-red-900/50 text-red-200' : 'bg-purple-900/50 text-purple-200'}`}>
              {statusMsg.texto}
            </div>
          )}

          <div className="space-y-3">
            {!location ? (
              <button 
                onClick={capturarLocalizacao} 
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <MapPin size={20} /> Ativar GPS
              </button>
            ) : (
              <div className="space-y-4">
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setTipoPonto('ENTRADA')}
                    className={`p-3 rounded-lg text-xs font-bold border transition-colors ${tipoPonto === 'ENTRADA' ? 'bg-green-600 border-green-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                  >
                    INÍCIO EXPEDIENTE
                  </button>
                  <button 
                    onClick={() => setTipoPonto('SAIDA_ALMOCO')}
                    className={`p-3 rounded-lg text-xs font-bold border transition-colors ${tipoPonto === 'SAIDA_ALMOCO' ? 'bg-yellow-600 border-yellow-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                  >
                    SAÍDA ALMOÇO
                  </button>
                  <button 
                    onClick={() => setTipoPonto('VOLTA_ALMOCO')}
                    className={`p-3 rounded-lg text-xs font-bold border transition-colors ${tipoPonto === 'VOLTA_ALMOCO' ? 'bg-yellow-600 border-yellow-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                  >
                    VOLTA ALMOÇO
                  </button>
                  <button 
                    onClick={() => setTipoPonto('SAIDA')}
                    className={`p-3 rounded-lg text-xs font-bold border transition-colors ${tipoPonto === 'SAIDA' ? 'bg-red-600 border-red-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                  >
                    FIM EXPEDIENTE
                  </button>
                </div>

                <button
                  onClick={baterPonto}
                  disabled={loading || cameraErro} 
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${
                    loading || cameraErro ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {loading ? 'Validando...' : (
                    <>
                      <Camera size={20} /> 
                      REGISTRAR: {tipoPonto.replace('_', ' ')}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}