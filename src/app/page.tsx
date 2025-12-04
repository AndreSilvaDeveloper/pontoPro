'use client';

import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { MapPin, Camera, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react'; // Importamos o hook de sessão
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session, status } = useSession(); // Pega dados da sessão
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const webcamRef = useRef<Webcam>(null);

  // Se não estiver logado, redireciona para login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
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
        // AGORA USAMOS O ID REAL DO USUÁRIO LOGADO!
        // @ts-ignore
        usuarioId: session?.user?.id, 
        latitude: location.lat,
        longitude: location.lng,
        fotoBase64: imageSrc
      });

      setStatusMsg({ 
        tipo: 'sucesso', 
        texto: `✅ ${response.data.mensagem}` 
      });

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
        
        {/* Cabeçalho com Logout */}
        <div className="p-4 flex justify-between items-center border-b border-slate-700 bg-slate-950">
          <div>
            <h1 className="font-bold text-blue-400">Olá, {session?.user?.name}</h1>
            <p className="text-xs text-slate-500">Pronto para trabalhar?</p>
          </div>
          <button 
            onClick={() => signOut()}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="relative rounded-xl overflow-hidden border-2 border-slate-600 bg-black aspect-video">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
            />
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-lg text-sm text-center font-bold ${
              statusMsg.tipo === 'erro' ? 'bg-red-900/50 text-red-200' : 
              statusMsg.tipo === 'sucesso' ? 'bg-green-900/50 text-green-200' : 
              'bg-blue-900/50 text-blue-200'
            }`}>
              {statusMsg.texto}
            </div>
          )}

          <div className="space-y-3">
            {!location ? (
              <button
                onClick={capturarLocalizacao}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <MapPin size={20} /> Ativar GPS
              </button>
            ) : (
              <button
                onClick={baterPonto}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  loading ? 'bg-slate-600' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading ? 'Enviando...' : <><Camera size={20} /> BATER PONTO</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}