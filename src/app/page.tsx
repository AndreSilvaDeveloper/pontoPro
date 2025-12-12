'use client';

import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { 
  MapPin, Camera, LogOut, History, RefreshCcw, 
  FileText, PenTool, AlertCircle, User 
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);
  
  // Localização
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [tipoPonto, setTipoPonto] = useState('ENTRADA'); 
  const [cameraErro, setCameraErro] = useState(false);
  
  // Configs
  const [configs, setConfigs] = useState<any>({ exigirFoto: true, bloquearForaDoRaio: true, ocultarSaldoHoras: false });
  
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); } 
    else if (status === 'authenticated') {
      // @ts-ignore
      if (session?.user?.deveTrocarSenha) { router.push('/trocar-senha'); return; }
      // @ts-ignore
      if (session?.user?.cargo === 'ADMIN') { router.push('/admin'); return; }
      // @ts-ignore
      if (session?.user?.cargo === 'SUPER_ADMIN') { router.push('/saas'); return; }

      axios.get('/api/funcionario/config')
        .then(res => { if (res.data) setConfigs(res.data); })
        .catch(err => console.error("Erro config", err));
    }
  }, [status, router, session]);

  const tentarRecuperarCamera = async () => {
    setCameraErro(false);
    setStatusMsg({ tipo: 'info', texto: 'Tentando ativar câmera...' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setStatusMsg(null);
    } catch (err) {
      setCameraErro(true);
      setStatusMsg({ tipo: 'erro', texto: 'O acesso continua bloqueado.' });
    }
  };

  const capturarLocalizacao = () => {
    setStatusMsg({ tipo: 'info', texto: 'Buscando GPS...' });
    if (!navigator.geolocation) {
      setStatusMsg({ tipo: 'erro', texto: 'Navegador sem GPS.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatusMsg({ tipo: 'sucesso', texto: 'GPS Localizado! Câmera ativada.' });
      },
      (error) => setStatusMsg({ tipo: 'erro', texto: 'Erro GPS: ' + error.message })
    );
  };

  const baterPonto = async () => {
    if (!location) { setStatusMsg({ tipo: 'erro', texto: 'GPS obrigatório!' }); return; }

    let imageSrc = null;
    if (configs.exigirFoto) {
        imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) {
            setCameraErro(true);
            setStatusMsg({ tipo: 'erro', texto: 'Câmera inacessível.' });
            return;
        }
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/bater-ponto', {
        // @ts-ignore
        usuarioId: session?.user?.id, 
        latitude: location.lat, longitude: location.lng, 
        fotoBase64: imageSrc, tipo: tipoPonto 
      });
      setStatusMsg({ tipo: 'sucesso', texto: `✅ ${response.data.mensagem}` });
    } catch (error: any) {
      setStatusMsg({ tipo: 'erro', texto: `❌ ${error.response?.data?.erro || 'Erro ao registrar'}` });
    } finally { setLoading(false); }
  };

  if (status === 'loading') return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Carregando...</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4">
      <div className="w-full max-w-md space-y-4">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-xl font-bold border-2 border-purple-400">
                    {session?.user?.name?.charAt(0) || <User />}
                </div>
                <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Olá,</p>
                    <h1 className="font-bold text-lg leading-tight truncate w-40">{session?.user?.name?.split(' ')[0]}</h1>
                </div>
            </div>
            <button onClick={() => signOut()} className="p-3 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"><LogOut size={20} /></button>
        </div>

        {/* MENU */}
        <div className="grid grid-cols-3 gap-2">
            <Link href="/funcionario/assinatura" className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-3 rounded-xl border border-slate-700 transition-all active:scale-95 group"><div className="bg-purple-900/30 text-purple-400 p-2 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors"><PenTool size={20} /></div><span className="text-[10px] font-bold uppercase text-slate-300">Assinar</span></Link>
            <Link href="/funcionario/ausencias" className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-3 rounded-xl border border-slate-700 transition-all active:scale-95 group"><div className="bg-yellow-900/30 text-yellow-500 p-2 rounded-full group-hover:bg-yellow-600 group-hover:text-white transition-colors"><FileText size={20} /></div><span className="text-[10px] font-bold uppercase text-slate-300">Justificar</span></Link>
            <Link href="/funcionario/historico" className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-3 rounded-xl border border-slate-700 transition-all active:scale-95 group"><div className="bg-blue-900/30 text-blue-400 p-2 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors"><History size={20} /></div><span className="text-[10px] font-bold uppercase text-slate-300">Histórico</span></Link>
        </div>

        {/* ÁREA DE PONTO */}
        <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700 p-4 space-y-4">
            
            {/* === MUDANÇA: SÓ MOSTRA CÂMERA SE TIVER LOCATION === */}
            {configs.exigirFoto && location && (
                <div className={`relative rounded-xl overflow-hidden bg-black aspect-video border-2 ${cameraErro ? 'border-red-500' : 'border-slate-600'}`}>
                    {!cameraErro ? (
                        <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" onUserMediaError={() => setCameraErro(true)} />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-center p-4">
                            <AlertCircle size={32} className="text-red-500 mb-2" />
                            <p className="text-red-400 font-bold text-sm">Câmera Bloqueada</p>
                            <button onClick={tentarRecuperarCamera} className="mt-3 bg-slate-700 text-white px-3 py-2 rounded text-xs font-bold flex gap-2"><RefreshCcw size={14}/> Tentar Novamente</button>
                        </div>
                    )}
                </div>
            )}

            {/* Mensagem Status */}
            {statusMsg && (
                <div className={`p-3 rounded-lg text-sm text-center font-bold animate-pulse ${statusMsg.tipo === 'erro' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                    {statusMsg.texto}
                </div>
            )}

            {/* SE NÃO TIVER LOCATION, MOSTRA BOTÃO DE GPS. SE TIVER, MOSTRA BOTÕES DE PONTO */}
            {!location ? (
                <button onClick={capturarLocalizacao} className="w-full py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 animate-bounce">
                    <MapPin size={20} /> ATIVAR LOCALIZAÇÃO
                </button>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={()=>setTipoPonto('ENTRADA')} className={`p-3 rounded-lg text-[10px] font-bold border transition-all ${tipoPonto==='ENTRADA' ? 'bg-green-600 border-green-400 text-white shadow-lg scale-105' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>ENTRADA</button>
                        <button onClick={()=>setTipoPonto('SAIDA_ALMOCO')} className={`p-3 rounded-lg text-[10px] font-bold border transition-all ${tipoPonto==='SAIDA_ALMOCO' ? 'bg-yellow-600 border-yellow-400 text-white shadow-lg scale-105' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>IDA ALMOÇO</button>
                        <button onClick={()=>setTipoPonto('VOLTA_ALMOCO')} className={`p-3 rounded-lg text-[10px] font-bold border transition-all ${tipoPonto==='VOLTA_ALMOCO' ? 'bg-yellow-600 border-yellow-400 text-white shadow-lg scale-105' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>VOLTA ALMOÇO</button>
                        <button onClick={()=>setTipoPonto('SAIDA')} className={`p-3 rounded-lg text-[10px] font-bold border transition-all ${tipoPonto==='SAIDA' ? 'bg-red-600 border-red-400 text-white shadow-lg scale-105' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>SAÍDA</button>
                    </div>
                    <button onClick={baterPonto} disabled={loading || (configs.exigirFoto && cameraErro)} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg shadow-xl transition-all active:scale-95 ${loading ? 'bg-slate-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
                        {loading ? 'Registrando...' : <><Camera size={24} /> REGISTRAR PONTO</>}
                    </button>
                </div>
            )}
        </div>

        {/* Rodapé Informativo */}
        {!configs.ocultarSaldoHoras && (
            <p className="text-center text-[10px] text-slate-600 mt-4">WorkID v2.0 • Geolocalização Ativa</p>
        )}

      </div>
    </main>
  );
}