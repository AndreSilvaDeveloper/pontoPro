'use client';

import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { 
  MapPin, Camera, LogOut, History, RefreshCcw, 
  FileText, PenTool, AlertCircle, User, LogIn, Coffee, ArrowRightCircle, CupSoda, CheckCircle2, Loader2, Clock,
  PlusCircle, X, Save // Adicionados novos ícones
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // === ESTADOS ORIGINAIS ===
  const [loading, setLoading] = useState(false);
  const [acaoEmProcesso, setAcaoEmProcesso] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cameraErro, setCameraErro] = useState(false);
  const [horaAtual, setHoraAtual] = useState('');
  
  const [configs, setConfigs] = useState<any>({ 
      exigirFoto: true, 
      bloquearForaDoRaio: true, 
      ocultarSaldoHoras: false,
      fluxoEstrito: true 
  });
  
  const [statusPonto, setStatusPonto] = useState<string | null>(null);
  const [ultimoPontoData, setUltimoPontoData] = useState<Date | null>(null);
  const [tempoIntervalo, setTempoIntervalo] = useState('00:00:00');
  const [jaAlmocou, setJaAlmocou] = useState(false);
  const [carregandoStatus, setCarregandoStatus] = useState(true);
  const [tipoManual, setTipoManual] = useState('ENTRADA');
  
  const webcamRef = useRef<Webcam>(null);

  // === NOVOS ESTADOS PARA O MODAL DE INCLUSÃO ===
  const [modalInclusaoAberto, setModalInclusaoAberto] = useState(false);
  const [dataNova, setDataNova] = useState('');
  const [horaNova, setHoraNova] = useState('');
  const [tipoNovo, setTipoNovo] = useState('ENTRADA');
  const [motivo, setMotivo] = useState('');

  // === RELÓGIO E CRONÔMETRO ===
  useEffect(() => {
    const timer = setInterval(() => {
        const agora = new Date();
        setHoraAtual(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

        if (ultimoPontoData && (statusPonto === 'SAIDA_ALMOCO' || statusPonto === 'SAIDA_INTERVALO')) {
            const diffMs = agora.getTime() - new Date(ultimoPontoData).getTime();
            
            const totalSeconds = Math.floor(diffMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const timeString = [hours, minutes, seconds]
                .map(v => v < 10 ? "0" + v : v)
                .join(":");
            
            setTempoIntervalo(timeString);
        }
    }, 1000);
    return () => clearInterval(timer);
  }, [ultimoPontoData, statusPonto]);

  const carregarConfigEStatus = async () => {
      // @ts-ignore
      if (!session?.user?.id) return;

      try {
          const timestamp = new Date().getTime();
          
          const [resConfig, resStatus] = await Promise.all([
              axios.get('/api/funcionario/config', { params: { _t: timestamp } }),
              axios.get('/api/funcionario/ponto/status', {
                  // @ts-ignore
                  params: { usuarioId: session?.user?.id, _t: timestamp } 
              })
          ]);
          
          setConfigs({
              ...resConfig.data,
              fluxoEstrito: resConfig.data.fluxoEstrito !== false
          });

          setStatusPonto(resStatus.data.ultimoTipo || null);
          
          const dataRegistro = resStatus.data.data || resStatus.data.ultimoRegistro;
          setUltimoPontoData(dataRegistro ? new Date(dataRegistro) : null);

          setJaAlmocou(resStatus.data.jaAlmocou || false);

      } catch (e) { 
          console.error(e); 
      } finally { 
          setCarregandoStatus(false); 
      }
  };

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); } 
    else if (status === 'authenticated') {
      // @ts-ignore
      if (session?.user?.deveTrocarSenha) { router.push('/trocar-senha'); return; }
      // @ts-ignore
      if (session?.user?.cargo === 'ADMIN') { router.push('/admin'); return; }

      carregarConfigEStatus();
    }
  }, [status, router, session]);

  // === FUNÇÕES DE CÂMERA E GPS ===
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
    setStatusMsg({ tipo: 'info', texto: 'Buscando satélites...' });
    if (!navigator.geolocation) {
      setStatusMsg({ tipo: 'erro', texto: 'Navegador sem GPS.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatusMsg({ tipo: 'sucesso', texto: 'Localização Confirmada!' });
        setTimeout(() => setStatusMsg(null), 3000);
      },
      (error) => setStatusMsg({ tipo: 'erro', texto: 'Erro GPS: ' + error.message })
    );
  };

  const baterPonto = async (tipoAcao?: string) => {
    const tipoFinal = tipoAcao || tipoManual;
    setAcaoEmProcesso(tipoFinal); 

    if (!location) { 
        setStatusMsg({ tipo: 'erro', texto: 'Precisamos da sua localização!' }); 
        setAcaoEmProcesso(null);
        return; 
    }

    let imageSrc = null;
    if (configs.exigirFoto) {
        imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) {
            setCameraErro(true);
            setStatusMsg({ tipo: 'erro', texto: 'Não conseguimos capturar a foto.' });
            setAcaoEmProcesso(null);
            return;
        }
    }

    setLoading(true);
    try {
      // @ts-ignore
      await axios.post('/api/funcionario/ponto', {
        // @ts-ignore
        usuarioId: session?.user?.id, 
        latitude: location.lat, longitude: location.lng, 
        fotoBase64: imageSrc, 
        tipo: tipoFinal 
      });
      
      setStatusPonto(tipoFinal);
      setUltimoPontoData(new Date());

      if (tipoFinal === 'VOLTA_ALMOCO') setJaAlmocou(true);

      setStatusMsg({ tipo: 'sucesso', texto: `✅ Ponto Registrado!` });
      
      setTimeout(() => {
          setStatusMsg(null);
          carregarConfigEStatus();
          setAcaoEmProcesso(null); 
      }, 1500);

    } catch (error: any) {
      setStatusMsg({ tipo: 'erro', texto: `❌ ${error.response?.data?.erro || 'Erro ao registrar'}` });
      setAcaoEmProcesso(null);
    } finally { 
        setLoading(false); 
    }
  };

  // === FUNÇÕES DA NOVA MODAL DE INCLUSÃO ===
  const abrirModalInclusao = () => {
      // Data de hoje formatada YYYY-MM-DD
      const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
      setDataNova(hoje);
      setHoraNova('');
      setTipoNovo('ENTRADA');
      setMotivo('');
      setModalInclusaoAberto(true);
  };

  const enviarSolicitacaoInclusao = async () => { 
      if (!motivo || !horaNova || !dataNova) return alert('Preencha todos os campos!'); 
      
      const dataHoraFinal = new Date(`${dataNova}T${horaNova}:00`); 
      
      try { 
          await axios.post('/api/funcionario/solicitar-ajuste', { 
              pontoId: null, // null indica que é inclusão de novo registro
              tipo: tipoNovo, 
              novoHorario: dataHoraFinal.toISOString(), 
              motivo 
          }); 
          alert('Solicitação enviada com sucesso! Acompanhe no Histórico.'); 
          setModalInclusaoAberto(false);
      } catch (error) { 
          alert('Erro ao enviar solicitação.'); 
      } 
  };

  if (status === 'loading') return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400 gap-3">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        Carregando...
    </div>
  );

  // Componente Visual do Timer
  const IntervalDisplay = ({ label, tempo }: { label: string, tempo: string }) => (
      <div className="w-full bg-amber-900/20 border border-amber-500/50 rounded-2xl p-4 mb-4 flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2 bg-amber-500/20 rounded-lg animate-pulse">
                  <Clock size={24} />
              </div>
              <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Status Atual</p>
                  <p className="text-sm font-bold uppercase tracking-wide text-white">{label}</p>
              </div>
          </div>
          <span className="text-2xl font-mono font-bold text-white tracking-widest tabular-nums">{tempo}</span>
      </div>
  );

  const renderizarBotoesInteligentes = () => {
      const btnBase = "w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 text-white relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed";
      
      if (!statusPonto || statusPonto === 'SAIDA') {
          return (
            <button onClick={() => baterPonto('ENTRADA')} disabled={loading} className={`${btnBase} bg-gradient-to-r from-emerald-600 to-emerald-500`}>
                {acaoEmProcesso === 'ENTRADA' ? <Loader2 className="animate-spin" /> : <><LogIn size={28} /> INICIAR TRABALHO</>}
            </button>
          );
      }

      if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(statusPonto)) {
          return (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in">
                {jaAlmocou ? (
                     <button onClick={() => baterPonto('SAIDA_INTERVALO')} disabled={loading} className={`${btnBase} bg-gradient-to-r from-amber-500 to-yellow-500`}>
                        {acaoEmProcesso === 'SAIDA_INTERVALO' ? <Loader2 className="animate-spin" /> : <><Coffee size={28} /> PAUSA PARA CAFÉ</>}
                    </button>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => baterPonto('SAIDA_INTERVALO')} disabled={loading} className="py-6 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-amber-400 shadow-lg active:scale-95 transition-all disabled:opacity-50">
                            {acaoEmProcesso === 'SAIDA_INTERVALO' ? <Loader2 className="animate-spin" size={32}/> : <Coffee size={32} />}
                            <span className="text-xs uppercase tracking-wider">{acaoEmProcesso === 'SAIDA_INTERVALO' ? 'Registrando...' : 'Pausa Café'}</span>
                        </button>
                        <button onClick={() => baterPonto('SAIDA_ALMOCO')} disabled={loading} className="py-6 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-orange-600 to-red-500 text-white shadow-lg active:scale-95 transition-all disabled:opacity-50">
                            {acaoEmProcesso === 'SAIDA_ALMOCO' ? <Loader2 className="animate-spin" size={32}/> : <CupSoda size={32} />}
                            <span className="text-xs uppercase tracking-wider">{acaoEmProcesso === 'SAIDA_ALMOCO' ? 'Registrando...' : 'Almoço'}</span>
                        </button>
                    </div>
                )}
                
                <button onClick={() => baterPonto('SAIDA')} disabled={loading} className="w-full py-4 rounded-xl font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center justify-center gap-2 text-sm transition-colors mt-2 disabled:opacity-50">
                    {acaoEmProcesso === 'SAIDA' ? <Loader2 className="animate-spin" size={18}/> : <><LogOut size={18} /> Encerrar Expediente</>}
                </button>
            </div>
          );
      }

      if (statusPonto === 'SAIDA_ALMOCO') {
        return (
          <div className="animate-in slide-in-from-bottom-4 fade-in">
              <button onClick={() => baterPonto('VOLTA_ALMOCO')} disabled={loading} className={`${btnBase} bg-gradient-to-r from-blue-600 to-blue-500`}>
                  {acaoEmProcesso === 'VOLTA_ALMOCO' ? <Loader2 className="animate-spin" /> : <><ArrowRightCircle size={28} /> VOLTAR DO ALMOÇO</>}
              </button>
          </div>
        );
      }

      if (statusPonto === 'SAIDA_INTERVALO') {
        return (
          <div className="animate-in slide-in-from-bottom-4 fade-in">
              <button onClick={() => baterPonto('VOLTA_INTERVALO')} disabled={loading} className={`${btnBase} bg-gradient-to-r from-indigo-600 to-indigo-500`}>
                  {acaoEmProcesso === 'VOLTA_INTERVALO' ? <Loader2 className="animate-spin" /> : <><ArrowRightCircle size={28} /> VOLTAR DO CAFÉ</>}
              </button>
          </div>
        );
      }
  };

  const renderizarBotoesFlexiveis = () => {
      const btnFlex = "p-3 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1 active:scale-95 disabled:opacity-50";
      return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
                <button onClick={()=>setTipoManual('ENTRADA')} className={`${btnFlex} ${tipoManual==='ENTRADA' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><LogIn size={16}/> Entrada</button>
                <button onClick={()=>setTipoManual('SAIDA_ALMOCO')} className={`${btnFlex} ${tipoManual==='SAIDA_ALMOCO' ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><CupSoda size={16}/> Almoço</button>
                <button onClick={()=>setTipoManual('VOLTA_ALMOCO')} className={`${btnFlex} ${tipoManual==='VOLTA_ALMOCO' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><ArrowRightCircle size={16}/> Volta</button>
                <button onClick={()=>setTipoManual('SAIDA_INTERVALO')} className={`${btnFlex} ${tipoManual==='SAIDA_INTERVALO' ? 'bg-yellow-600 border-yellow-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><Coffee size={16}/> Café</button>
                <button onClick={()=>setTipoManual('VOLTA_INTERVALO')} className={`${btnFlex} ${tipoManual==='VOLTA_INTERVALO' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><ArrowRightCircle size={16}/> Volta</button>
                <button onClick={()=>setTipoManual('SAIDA')} className={`${btnFlex} ${tipoManual==='SAIDA' ? 'bg-red-600 border-red-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><LogOut size={16}/> Saída</button>
            </div>
            
            <button onClick={() => baterPonto()} disabled={loading || (configs.exigirFoto && cameraErro)} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-lg shadow-xl transition-all active:scale-95 disabled:opacity-70 ${loading ? 'bg-slate-600' : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white'}`}>
                {loading ? <><Loader2 className="animate-spin" /> Registrando...</> : <><Camera size={24} /> CONFIRMAR PONTO</>}
            </button>
        </div>
      );
  }

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      <div className="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                        {session?.user?.name?.charAt(0) || <User />}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                </div>
                <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-0.5">Olá, {session?.user?.name?.split(' ')[0]}</p>
                    <h1 className="font-mono text-xl font-bold text-white tracking-tight">{horaAtual || '--:--'}</h1>
                </div>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="p-3 bg-white/5 hover:bg-red-500/20 rounded-2xl text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all active:scale-95">
                <LogOut size={20} />
            </button>
        </div>

        {/* CRONÔMETRO DE INTERVALO */}
        {(statusPonto === 'SAIDA_ALMOCO' || statusPonto === 'SAIDA_INTERVALO') && (
             <IntervalDisplay 
                label={statusPonto === 'SAIDA_ALMOCO' ? "Em Almoço" : "Em Pausa"} 
                tempo={tempoIntervalo} 
             />
        )}

        {/* ÁREA PRINCIPAL (CÂMERA E AÇÃO) */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/5 p-5 space-y-5">
            
            {statusMsg && (
                <div className={`p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 shadow-lg animate-in slide-in-from-top-2 ${statusMsg.tipo === 'erro' ? 'bg-red-500/20 text-red-200 border border-red-500/30' : statusMsg.tipo === 'sucesso' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-200 border border-blue-500/30'}`}>
                    {statusMsg.tipo === 'erro' ? <AlertCircle size={18}/> : statusMsg.tipo === 'sucesso' ? <CheckCircle2 size={18}/> : <RefreshCcw size={18} className="animate-spin"/>}
                    {statusMsg.texto}
                </div>
            )}

            {/* Câmera */}
            {configs.exigirFoto && location && (
                <div className={`relative rounded-2xl overflow-hidden bg-black aspect-[4/3] border-2 shadow-inner ${cameraErro ? 'border-red-500/50' : 'border-purple-500/30 ring-1 ring-purple-500/20'}`}>
                    {!cameraErro ? (
                        <Webcam 
                            audio={false} 
                            ref={webcamRef} 
                            screenshotFormat="image/jpeg" 
                            videoConstraints={{ facingMode: "user" }}
                            className="w-full h-full object-cover" 
                            onUserMediaError={() => setCameraErro(true)} 
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-center p-6">
                            <div className="bg-red-500/10 p-4 rounded-full mb-3"><AlertCircle size={32} className="text-red-500" /></div>
                            <p className="text-red-400 font-bold mb-1">Câmera Indisponível</p>
                            <p className="text-slate-500 text-xs mb-4">Verifique as permissões do navegador</p>
                            <button onClick={tentarRecuperarCamera} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-colors">Tentar Novamente</button>
                        </div>
                    )}
                    {!cameraErro && <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">AO VIVO</div>}
                </div>
            )}

            {/* Botão de Localização ou Ações */}
            {!location ? (
                <div className="py-8 flex flex-col items-center text-center">
                    <div className="bg-purple-500/10 p-6 rounded-full mb-4 animate-bounce">
                        <MapPin size={40} className="text-purple-500" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Ativar Localização</h3>
                    <p className="text-slate-400 text-sm mb-6 max-w-[200px]">Precisamos do seu GPS para validar o ponto.</p>
                    <button onClick={capturarLocalizacao} className="w-full py-4 bg-white text-slate-900 hover:bg-slate-200 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95">
                        PERMITIR ACESSO
                    </button>
                </div>
            ) : (
                <div className="mt-2">
                    {carregandoStatus ? (
                         <div className="py-10 text-center">
                             <div className="inline-block w-8 h-8 border-4 border-slate-600 border-t-purple-500 rounded-full animate-spin mb-3"></div>
                             <p className="text-slate-500 text-sm font-medium">Sincronizando...</p>
                         </div>
                    ) : (
                        configs.fluxoEstrito ? renderizarBotoesInteligentes() : renderizarBotoesFlexiveis()
                    )}
                </div>
            )}
        </div>

        {/* MENU RÁPIDO (AGORA COM O BOTÃO 'ESQUECI' INCLUÍDO) */}
        <div className="grid grid-cols-2 gap-3">
            <button onClick={abrirModalInclusao} className="flex flex-col items-center justify-center gap-2 bg-slate-900/40 hover:bg-slate-800/60 p-4 rounded-2xl border border-white/5 transition-all active:scale-95 group backdrop-blur-sm cursor-pointer">
                <div className="bg-emerald-500/10 text-emerald-500 p-2.5 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors"><PlusCircle size={20} /></div>
                <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-white">Esqueci de bater o Ponto</span>
            </button>
            
            <Link href="/funcionario/assinatura" className="flex flex-col items-center justify-center gap-2 bg-slate-900/40 hover:bg-slate-800/60 p-4 rounded-2xl border border-white/5 transition-all active:scale-95 group backdrop-blur-sm">
                <div className="bg-purple-500/10 text-purple-400 p-2.5 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors"><PenTool size={20} /></div>
                <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-white">Assinar</span>
            </Link>
            
            <Link href="/funcionario/ausencias" className="flex flex-col items-center justify-center gap-2 bg-slate-900/40 hover:bg-slate-800/60 p-4 rounded-2xl border border-white/5 transition-all active:scale-95 group backdrop-blur-sm">
                <div className="bg-yellow-500/10 text-yellow-500 p-2.5 rounded-xl group-hover:bg-yellow-500 group-hover:text-white transition-colors"><FileText size={20} /></div>
                <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-white">Justificar Falta</span>
            </Link>
            
            <Link href="/funcionario/historico" className="flex flex-col items-center justify-center gap-2 bg-slate-900/40 hover:bg-slate-800/60 p-4 rounded-2xl border border-white/5 transition-all active:scale-95 group backdrop-blur-sm">
                <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors"><History size={20} /></div>
                <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-white">Histórico</span>
            </Link>
        </div>

        {!configs.ocultarSaldoHoras && (
            <div className="text-center">
                <p className="text-[10px] text-slate-600 font-medium bg-slate-900/30 inline-block px-3 py-1 rounded-full border border-white/5">
                    Geolocalização Ativa &bull; WorkID
                </p>
            </div>
        )}

      </div>

      {/* MODAL DE INCLUSÃO (MOVIDO DO HISTÓRICO PARA CÁ) */}
      {modalInclusaoAberto && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 sm:p-6">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setModalInclusaoAberto(false)} />
                <div className="bg-[#0f172a] border border-slate-700 w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-5 relative z-10 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                           <PlusCircle size={20} className="text-emerald-400"/> Incluir Registro
                        </h3>
                        <button onClick={() => setModalInclusaoAberto(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Data</label>
                            <input type="date" value={dataNova} onChange={e=>setDataNova(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm text-center outline-none focus:border-purple-500 transition-colors" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Tipo</label>
                            <select value={tipoNovo} onChange={e=>setTipoNovo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-xs outline-none focus:border-purple-500 appearance-none">
                                <option value="ENTRADA">ENTRADA</option>
                                <option value="SAIDA_ALMOCO">SAÍDA ALMOÇO</option>
                                <option value="VOLTA_ALMOCO">VOLTA ALMOÇO</option>
                                <option value="SAIDA">SAÍDA</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Novo Horário</label>
                        <input type="time" value={horaNova} onChange={e=>setHoraNova(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white text-3xl font-bold text-center outline-none focus:border-purple-500 transition-all focus:ring-2 focus:ring-purple-500/20" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Justificativa (Obrigatório)</label>
                        <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ex: Esqueci de bater, estava em reunião..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm h-24 resize-none outline-none focus:border-purple-500 transition-colors" />
                    </div>
                    <button onClick={enviarSolicitacaoInclusao} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-purple-900/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Save size={18} /> Enviar Solicitação
                    </button>
                </div>
            </div>
        )}
    </main>
  );
}