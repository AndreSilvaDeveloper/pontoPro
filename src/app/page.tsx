'use client';

import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { MapPin, Camera, LogOut, LayoutDashboard } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // CORREÇÃO AQUI: Criamos o estado que faltava
  const [tipoPonto, setTipoPonto] = useState('ENTRADA'); 
  
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
    setLoading(true);
    const imageSrc = webcamRef.current?.getScreenshot();

    try {
      const response = await axios.post('/api/bater-ponto', {
        // @ts-ignore
        usuarioId: session?.user?.id, 
        latitude: location.lat,
        longitude: location.lng,
        fotoBase64: imageSrc,
        tipo: tipoPonto // Agora essa variável existe!
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
            <h1 className="font-bold text-blue-400">Olá, {session?.user?.name}</h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-bold border border-slate-700">
              {session?.user?.cargo}
            </span>
          </div>
          <div className="flex gap-2">
            {session?.user?.cargo === 'ADMIN' && (
              <Link href="/admin" className="p-2 text-blue-400 hover:text-blue-300 transition-colors">
                <LayoutDashboard size={20} />
              </Link>
            )}
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Câmera e Status */}
        <div className="p-6 space-y-6">
          <div className="relative rounded-xl overflow-hidden border-2 border-slate-600 bg-black aspect-video">
            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover"/>
          </div>
          
          {statusMsg && (
            <div className={`p-3 rounded-lg text-sm text-center font-bold ${statusMsg.tipo === 'erro' ? 'bg-red-900/50 text-red-200' : 'bg-blue-900/50 text-blue-200'}`}>
              {statusMsg.texto}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="space-y-3">
            {!location ? (
              <button 
                onClick={capturarLocalizacao} 
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <MapPin size={20} /> Ativar GPS
              </button>
            ) : (
              <div className="space-y-4">
                
                {/* GRID DE BOTÕES DE TIPO DE PONTO */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setTipoPonto('ENTRADA')}
                    className={`p-3 rounded-lg text-xs font-bold border transition-colors ${tipoPonto === 'ENTRADA' ? 'bg-green-600 border-green-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                  >
                    INÍCIO
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

                {/* BOTÃO PRINCIPAL DE REGISTRO */}
                <button
                  onClick={baterPonto}
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${
                    loading ? 'bg-slate-600' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Registrando...' : (
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