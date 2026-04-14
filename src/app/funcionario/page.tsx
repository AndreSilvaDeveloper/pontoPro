'use client';

import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import {
  MapPin, Camera, LogOut, History, RefreshCcw,
  AlertCircle, User, LogIn, Coffee, ArrowRightCircle, CupSoda, CheckCircle2, Loader2, Clock,
  PlusCircle, X, Save, HelpCircle, ShieldAlert, Briefcase, UtensilsCrossed, Pause
} from 'lucide-react';
import { format, getDay } from 'date-fns';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FUNC_TOUR_RESTART_EVENT } from '@/components/onboarding/FuncionarioTour';
import ThemeToggle from '@/components/ThemeToggle';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import dynamic from 'next/dynamic';

const MapaGeofence = dynamic(() => import('@/components/MapaGeofence'), {
  ssr: false,
  loading: () => <div className="w-full h-[200px] rounded-xl bg-elevated-solid animate-pulse" />,
});

// ✅ TIPAGEM DOS TIPOS (para não errar string)
type TipoSolicitacao =
  | 'ENTRADA'
  | 'SAIDA_INTERVALO'
  | 'VOLTA_INTERVALO'
  | 'SAIDA_ALMOCO'
  | 'VOLTA_ALMOCO'
  | 'SAIDA';

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
  const [tipoManual, setTipoManual] = useState<TipoSolicitacao>('ENTRADA');

  // === NOVOS: PROGRESSO DO DIA ===
  const [minutosTrabalhadosHoje, setMinutosTrabalhadosHoje] = useState(0);
  const [metaMinutosHoje, setMetaMinutosHoje] = useState(0);
  const [primeiraEntrada, setPrimeiraEntrada] = useState<Date | null>(null);
  const [jornadaHoje, setJornadaHoje] = useState<any>(null);
  const [alertaIntervaloMostrado, setAlertaIntervaloMostrado] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const [mostrarCamera, setMostrarCamera] = useState(true);
  const [acaoPendente, setAcaoPendente] = useState<TipoSolicitacao | null>(null);

  // === NOVOS ESTADOS PARA O MODAL DE INCLUSÃO ===
  const [modalInclusaoAberto, setModalInclusaoAberto] = useState(false);
  const [dataNova, setDataNova] = useState('');
  const [horaNova, setHoraNova] = useState('');
  const [tipoNovo, setTipoNovo] = useState<TipoSolicitacao>('ENTRADA');
  const [motivo, setMotivo] = useState('');

  // ✅ AVISO VISUAL (SUBSTITUI window.alert NO MOBILE)
  const [avisoInclusao, setAvisoInclusao] = useState<{
    tipo: 'sucesso' | 'erro' | 'info';
    texto: string;
    pontoIdSugerido?: string | null;
  } | null>(null);

  // === MAPA GEOFENCE ===
  const [mapaGeofenceAberto, setMapaGeofenceAberto] = useState(false);

  // === CONFIRMAÇÃO DE AÇÃO CRÍTICA ===
  const [modalConfirmacao, setModalConfirmacao] = useState<{
    tipo: TipoSolicitacao;
    avisos: string[];
  } | null>(null);

  // === RELÓGIO E CRONÔMETRO ===
  useEffect(() => {
    const timer = setInterval(() => {
      const agora = new Date();
      setHoraAtual(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

      if (ultimoPontoData && (statusPonto === 'SAIDA_ALMOCO' || statusPonto === 'SAIDA_INTERVALO')) {
        const diffMs = agora.getTime() - new Date(ultimoPontoData).getTime();
        const decorridoSeg = Math.floor(diffMs / 1000);

        // Limite em segundos conforme tipo de pausa
        let limiteSeg = 0;
        if (statusPonto === 'SAIDA_INTERVALO') {
          const limiteCafeMin = (configs as any).duracaoPausaCafeMin || 15;
          limiteSeg = limiteCafeMin * 60;
        } else if (statusPonto === 'SAIDA_ALMOCO') {
          let almocoMin = 60;
          try {
            if (jornadaHoje) {
              const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
              const diaAtual = diasMap[agora.getDay()];
              const jd = jornadaHoje[diaAtual];
              if (jd?.s1 && jd?.e2) {
                const parse = (h: string) => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };
                almocoMin = parse(jd.e2) - parse(jd.s1);
              }
            }
          } catch {}
          limiteSeg = almocoMin * 60;
        }

        const restanteSeg = limiteSeg - decorridoSeg;
        const negativo = restanteSeg < 0;
        const abs = Math.abs(restanteSeg);
        const hours = Math.floor(abs / 3600);
        const minutes = Math.floor((abs % 3600) / 60);
        const seconds = abs % 60;
        const timeString = (negativo ? '-' : '') + [hours, minutes, seconds]
          .map(v => (v < 10 ? '0' + v : String(v)))
          .join(':');

        setTempoIntervalo(timeString);

        if (statusPonto === 'SAIDA_INTERVALO' && negativo && !alertaIntervaloMostrado) {
          setAlertaIntervaloMostrado(true);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
      } else {
        setAlertaIntervaloMostrado(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [ultimoPontoData, statusPonto, alertaIntervaloMostrado, configs, jornadaHoje]);

  // Recarrega dados de progresso a cada 60s
  useEffect(() => {
    if (status !== 'authenticated' || !statusPonto || statusPonto === 'SAIDA') return;
    const intervalo = setInterval(() => {
      carregarConfigEStatus();
    }, 60000);
    return () => clearInterval(intervalo);
  }, [status, statusPonto]);

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

      const ultimoTipo = resStatus.data.ultimoTipo || null;
      setStatusPonto(ultimoTipo);

      const dataRegistro = resStatus.data.data || resStatus.data.ultimoRegistro;
      setUltimoPontoData(dataRegistro ? new Date(dataRegistro) : null);

      setJaAlmocou(resStatus.data.jaAlmocou || false);

      // Novos dados de progresso
      setMinutosTrabalhadosHoje(resStatus.data.minutosTrabalhadosHoje || 0);
      setMetaMinutosHoje(resStatus.data.metaMinutosHoje || 0);
      setPrimeiraEntrada(resStatus.data.primeiraEntrada ? new Date(resStatus.data.primeiraEntrada) : null);
      setJornadaHoje(resStatus.data.jornada || null);

      // Se já bateu ponto hoje, esconde a câmera e mostra status
      if (ultimoTipo && ultimoTipo !== 'SAIDA') {
        setMostrarCamera(false);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setCarregandoStatus(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session?.user?.deveTrocarSenha) { router.push('/trocar-senha'); return; }
      if (session?.user?.deveCadastrarFoto) { router.push('/cadastrar-foto'); return; }
      if (!session?.user?.temAssinatura) { router.push('/cadastrar-assinatura'); return; }
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
      (error) => setStatusMsg({ tipo: 'erro', texto: 'Erro GPS: ' + error.message }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // === VERIFICAÇÃO ANTES DE AÇÕES CRÍTICAS ===
  const tentarBaterPonto = (tipoAcao: TipoSolicitacao) => {
    // Para SAIDA, verificar se houve almoço/intervalo
    if (tipoAcao === 'SAIDA') {
      const avisos: string[] = [];

      if (!jaAlmocou && statusPonto !== 'SAIDA_ALMOCO') {
        avisos.push('Você não registrou almoço hoje');
      }

      if (avisos.length > 0) {
        setModalConfirmacao({ tipo: tipoAcao, avisos });
        return;
      }
    }

    baterPonto(tipoAcao);
  };

  const confirmarAcaoCritica = () => {
    if (!modalConfirmacao) return;
    const tipo = modalConfirmacao.tipo;
    setModalConfirmacao(null);
    baterPonto(tipo);
  };

  const baterPonto = async (tipoAcao?: TipoSolicitacao) => {
    const tipoFinal = (tipoAcao || tipoManual) as TipoSolicitacao;

    // Se câmera está fechada e empresa exige foto, reabre e aguarda confirmação
    if (!mostrarCamera && configs.exigirFoto) {
      setMostrarCamera(true);
      setAcaoPendente(tipoFinal);
      return;
    }

    executarPonto(tipoFinal);
  };

  const obterGPSAtual = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Navegador sem GPS.'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const executarPonto = async (tipoFinal: TipoSolicitacao) => {
    setAcaoEmProcesso(tipoFinal);
    setAcaoPendente(null);

    // Recaptura GPS em tempo real para evitar coordenada antiga/imprecisa
    setStatusMsg({ tipo: 'info', texto: 'Confirmando localização...' });
    let gpsAtual: { lat: number; lng: number };
    try {
      gpsAtual = await obterGPSAtual();
      setLocation(gpsAtual);
    } catch {
      // Fallback: usa a última localização conhecida
      if (!location) {
        setStatusMsg({ tipo: 'erro', texto: 'Não foi possível obter sua localização. Verifique o GPS.' });
        setAcaoEmProcesso(null);
        return;
      }
      gpsAtual = location;
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
        latitude: gpsAtual.lat, longitude: gpsAtual.lng,
        fotoBase64: imageSrc,
        tipo: tipoFinal
      });

      setStatusPonto(tipoFinal);
      setUltimoPontoData(new Date());
      setMostrarCamera(false);
      setAlertaIntervaloMostrado(false);

      if (tipoFinal === 'VOLTA_ALMOCO') setJaAlmocou(true);

      setStatusMsg({ tipo: 'sucesso', texto: `Ponto Registrado!` });

      setTimeout(() => {
        setStatusMsg(null);
        carregarConfigEStatus();
        setAcaoEmProcesso(null);
      }, 2000);

    } catch (error: any) {
      const semInternet = !error.response && (!navigator.onLine || error.code === 'ERR_NETWORK' || error.message === 'Network Error');

      if (semInternet) {
        // Salva na fila offline
        try {
          const { enqueuePonto } = await import('@/lib/offline/pontoQueue');
          await enqueuePonto({
            // @ts-ignore
            usuarioId: session?.user?.id,
            latitude: gpsAtual.lat,
            longitude: gpsAtual.lng,
            fotoBase64: imageSrc,
            tipo: tipoFinal,
            dataHoraOffline: new Date().toISOString(),
          });
          setStatusPonto(tipoFinal);
          setUltimoPontoData(new Date());
          setMostrarCamera(false);
          setStatusMsg({ tipo: 'sucesso', texto: 'Ponto salvo offline! Será enviado quando voltar a internet.' });
          setTimeout(() => {
            setStatusMsg(null);
            setAcaoEmProcesso(null);
          }, 3000);
          window.dispatchEvent(new Event('offline-queue-updated'));
        } catch (e) {
          setStatusMsg({ tipo: 'erro', texto: 'Sem internet e falha ao salvar offline. Tente novamente.' });
          setAcaoEmProcesso(null);
        }
      } else {
        setStatusMsg({ tipo: 'erro', texto: `${error.response?.data?.erro || 'Erro ao registrar'}` });
        setAcaoEmProcesso(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // === FUNÇÕES DA NOVA MODAL DE INCLUSÃO ===
  // === SUGESTÕES INTELIGENTES ===
  type Sugestao = { data: string; tipo: string; horario: string; label: string };
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);

  const carregarSugestoes = async () => {
    setCarregandoSugestoes(true);
    try {
      const hoje = new Date();
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 7);
      const inicioStr = format(inicio, 'yyyy-MM-dd');
      const fimStr = format(hoje, 'yyyy-MM-dd');

      const res = await axios.get(`/api/funcionario/historico?inicio=${inicioStr}&fim=${fimStr}`);
      const { pontos: registros, jornada: jornadaCompleta, feriados: feriadosList } = res.data;
      if (!jornadaCompleta || !registros) { setSugestoes([]); return; }

      const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const resultado: Sugestao[] = [];

      for (let d = 1; d <= 7; d++) {
        const dia = new Date(hoje);
        dia.setDate(dia.getDate() - d);
        const diaStr = format(dia, 'yyyy-MM-dd');
        const diaSemana = diasMap[getDay(dia)];
        const configDia = jornadaCompleta[diaSemana];

        if (!configDia || !configDia.ativo) continue;
        if (feriadosList?.includes(diaStr)) continue;

        const pontosDoDia = (registros || [])
          .filter((p: any) => p.tipo !== 'AUSENCIA' && format(new Date(p.dataHora), 'yyyy-MM-dd') === diaStr)
          .sort((a: any, b: any) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

        const tipos = pontosDoDia.map((p: any) => p.subTipo || p.tipo);

        if (pontosDoDia.length === 0 && configDia.e1) {
          resultado.push({ data: diaStr, tipo: 'ENTRADA', horario: configDia.e1, label: `Entrada em ${format(dia, 'dd/MM')}` });
          continue;
        }

        const temEntrada = tipos.includes('ENTRADA');
        const temSaidaAlmoco = tipos.includes('SAIDA_ALMOCO');
        const temVoltaAlmoco = tipos.includes('VOLTA_ALMOCO');
        const temSaida = tipos.includes('SAIDA');
        const jornadaContinua = !configDia.s1 || !/^\d{2}:\d{2}$/.test(configDia.s1);

        if (temEntrada && !temSaida) {
          resultado.push({ data: diaStr, tipo: 'SAIDA', horario: configDia.s2 || '18:00', label: `Saída em ${format(dia, 'dd/MM')}` });
        }
        if (!jornadaContinua) {
          if (temEntrada && !temSaidaAlmoco && !temSaida) {
            resultado.push({ data: diaStr, tipo: 'SAIDA_ALMOCO', horario: configDia.s1 || '12:00', label: `Almoço em ${format(dia, 'dd/MM')}` });
          }
          if (temSaidaAlmoco && !temVoltaAlmoco) {
            resultado.push({ data: diaStr, tipo: 'VOLTA_ALMOCO', horario: configDia.e2 || '13:00', label: `Volta almoço em ${format(dia, 'dd/MM')}` });
          }
        }
      }

      setSugestoes(resultado.slice(0, 5));
    } catch {
      setSugestoes([]);
    } finally {
      setCarregandoSugestoes(false);
    }
  };

  const aplicarSugestao = (sug: Sugestao) => {
    setDataNova(sug.data);
    setTipoNovo(sug.tipo as TipoSolicitacao);
    setHoraNova(sug.horario);
    setMotivo('Esqueci de bater o ponto');
  };

  const abrirModalInclusao = () => {
    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
    setDataNova(hoje);
    setHoraNova('');
    setTipoNovo('ENTRADA');
    setMotivo('');
    setAvisoInclusao(null);
    setModalInclusaoAberto(true);
    carregarSugestoes();
  };

  const enviarSolicitacaoInclusao = async () => {
    if (!motivo || !horaNova || !dataNova) {
      setAvisoInclusao({ tipo: 'erro', texto: 'Preencha todos os campos!' });
      return;
    }

    const dataHoraFinal = new Date(`${dataNova}T${horaNova}:00`);

    try {
      await axios.post('/api/funcionario/solicitar-ajuste', {
        pontoId: null,
        tipo: tipoNovo,
        novoHorario: dataHoraFinal.toISOString(),
        motivo
      });

      setAvisoInclusao({
        tipo: 'sucesso',
        texto: 'Solicitação enviada com sucesso! Acompanhe no Histórico.'
      });

      setTimeout(() => {
        setModalInclusaoAberto(false);
        setAvisoInclusao(null);
      }, 1200);

    } catch (error: any) {
      const data = error?.response?.data ?? {};
      const msg = data?.erro;
      const code = data?.code;
      const pontoIdSugerido = data?.pontoIdSugerido;

      if (code === 'USE_AJUSTE') {
        setAvisoInclusao({
          tipo: 'info',
          texto: msg || 'Você já bateu esse ponto hoje. Solicite AJUSTE no Histórico.',
          pontoIdSugerido: pontoIdSugerido ?? null
        });
        return;
      }

      setAvisoInclusao({
        tipo: 'erro',
        texto: msg || 'Erro ao enviar solicitação.'
      });
    }
  };

  if (status === 'loading') return (
    <div className="min-h-screen bg-page flex items-center justify-center text-text-muted gap-3">
      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      Carregando...
    </div>
  );

  // === STATUS VISUAL DO EXPEDIENTE ===
  const getStatusInfo = () => {
    if (!statusPonto || statusPonto === 'SAIDA') {
      return { label: 'Fora do expediente', icon: Briefcase, color: 'slate', pulse: false };
    }
    if (statusPonto === 'ENTRADA' || statusPonto === 'VOLTA_ALMOCO' || statusPonto === 'VOLTA_INTERVALO' || statusPonto === 'PONTO') {
      return { label: 'Trabalhando', icon: Briefcase, color: 'emerald', pulse: true };
    }
    if (statusPonto === 'SAIDA_ALMOCO') {
      return { label: 'Em Almoço', icon: UtensilsCrossed, color: 'orange', pulse: true };
    }
    if (statusPonto === 'SAIDA_INTERVALO') {
      return { label: 'Em Pausa', icon: Pause, color: 'amber', pulse: true };
    }
    return { label: 'Indefinido', icon: Briefcase, color: 'slate', pulse: false };
  };

  const statusColorMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    slate: { bg: 'bg-slate-500/10', text: 'text-text-muted', border: 'border-border-input/20', dot: 'bg-slate-400' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  };

  // Display grande de status após bater ponto
  const StatusDisplay = () => {
    if (!statusPonto || statusPonto === 'SAIDA') {
      return (
        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center mb-4">
            <Briefcase size={36} className="text-slate-400" />
          </div>
          <p className="text-lg font-bold text-text-muted">Fora do expediente</p>
          <p className="text-sm text-text-faint mt-1">Bom descanso!</p>
        </div>
      );
    }

    if (statusPonto === 'SAIDA_ALMOCO' || statusPonto === 'SAIDA_INTERVALO') {
      const isAlmoco = statusPonto === 'SAIDA_ALMOCO';
      return (
        <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-95 duration-500">
          <div className={`w-24 h-24 rounded-full ${isAlmoco ? 'bg-orange-500/10 border-orange-500/30' : 'bg-amber-500/10 border-amber-500/30'} border-2 flex items-center justify-center mb-5 relative`}>
            <div className={`absolute inset-0 rounded-full ${isAlmoco ? 'bg-orange-500/5' : 'bg-amber-500/5'} animate-ping`} />
            {isAlmoco ? <UtensilsCrossed size={40} className="text-orange-400 relative z-10" /> : <Coffee size={40} className="text-amber-400 relative z-10" />}
          </div>
          <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isAlmoco ? 'text-orange-500/70' : 'text-amber-500/70'} mb-2`}>
            {isAlmoco ? 'Em Almoço' : 'Em Pausa'}
          </p>
          <p className={`text-5xl font-mono font-bold tracking-widest tabular-nums mb-3 ${tempoIntervalo.startsWith('-') ? 'text-red-400' : 'text-text-primary'}`}>
            {tempoIntervalo}
          </p>
          <p className={`text-xs ${tempoIntervalo.startsWith('-') ? 'text-red-400/70' : 'text-text-faint'}`}>
            {tempoIntervalo.startsWith('-') ? 'Pausa excedida' : 'Tempo restante'}
          </p>
        </div>
      );
    }

    // Trabalhando
    const horasT = Math.floor(minutosTrabalhadosHoje / 60);
    const minutosT = minutosTrabalhadosHoje % 60;
    return (
      <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-5 relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500/5 animate-pulse" />
          <Briefcase size={40} className="text-emerald-400 relative z-10" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500/70 mb-2">Trabalhando</p>
        {minutosTrabalhadosHoje > 0 ? (
          <>
            <p className="text-3xl font-mono font-bold text-text-primary tabular-nums">{horasT}h{String(minutosT).padStart(2, '0')}</p>
            <p className="text-xs text-text-faint mt-1">trabalhadas hoje</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-text-primary">Bom trabalho!</p>
            <p className="text-sm text-text-faint mt-1">Seu ponto foi registrado</p>
          </>
        )}
      </div>
    );
  };

  const renderizarBotoesInteligentes = () => {
    const btnBase = "w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 text-text-primary relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed";

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
              <button onClick={() => baterPonto('SAIDA_INTERVALO')} disabled={loading} className="py-6 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 bg-elevated/80 border border-border-input hover:bg-elevated-solid text-amber-400 shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {acaoEmProcesso === 'SAIDA_INTERVALO' ? <Loader2 className="animate-spin" size={32} /> : <Coffee size={32} />}
                <span className="text-xs uppercase tracking-wider">{acaoEmProcesso === 'SAIDA_INTERVALO' ? 'Registrando...' : 'Pausa Café'}</span>
              </button>
              <button onClick={() => baterPonto('SAIDA_ALMOCO')} disabled={loading} className="py-6 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-orange-600 to-red-500 text-white shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {acaoEmProcesso === 'SAIDA_ALMOCO' ? <Loader2 className="animate-spin" size={32} /> : <CupSoda size={32} />}
                <span className="text-xs uppercase tracking-wider">{acaoEmProcesso === 'SAIDA_ALMOCO' ? 'Registrando...' : 'Almoço'}</span>
              </button>
            </div>
          )}

          <button onClick={() => tentarBaterPonto('SAIDA')} disabled={loading} className="w-full py-4 rounded-xl font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center justify-center gap-2 text-sm transition-colors mt-2 disabled:opacity-50">
            {acaoEmProcesso === 'SAIDA' ? <Loader2 className="animate-spin" size={18} /> : <><LogOut size={18} /> Encerrar Expediente</>}
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
          <button onClick={() => setTipoManual('ENTRADA')} className={`${btnFlex} ${tipoManual === 'ENTRADA' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-elevated-solid border-border-input text-text-muted'}`}><LogIn size={16} /> Entrada</button>
          <button onClick={() => setTipoManual('SAIDA_ALMOCO')} className={`${btnFlex} ${tipoManual === 'SAIDA_ALMOCO' ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-elevated-solid border-border-input text-text-muted'}`}><CupSoda size={16} /> Almoço</button>
          <button onClick={() => setTipoManual('VOLTA_ALMOCO')} className={`${btnFlex} ${tipoManual === 'VOLTA_ALMOCO' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-elevated-solid border-border-input text-text-muted'}`}><ArrowRightCircle size={16} /> Volta</button>
          <button onClick={() => setTipoManual('SAIDA_INTERVALO')} className={`${btnFlex} ${tipoManual === 'SAIDA_INTERVALO' ? 'bg-amber-600 border-amber-400 text-white shadow-lg' : 'bg-elevated-solid border-border-input text-text-muted'}`}><Coffee size={16} /> Café</button>
          <button onClick={() => setTipoManual('VOLTA_INTERVALO')} className={`${btnFlex} ${tipoManual === 'VOLTA_INTERVALO' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-elevated-solid border-border-input text-text-muted'}`}><ArrowRightCircle size={16} /> Volta</button>
          <button onClick={() => setTipoManual('SAIDA')} className={`${btnFlex} ${tipoManual === 'SAIDA' ? 'bg-red-600 border-red-400 text-white shadow-lg' : 'bg-elevated-solid border-border-input text-text-muted'}`}><LogOut size={16} /> Saída</button>
        </div>

        <button onClick={() => baterPonto()} disabled={loading || (configs.exigirFoto && cameraErro)} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-lg shadow-xl transition-all active:scale-95 disabled:opacity-70 ${loading ? 'bg-slate-600' : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white'}`}>
          {loading ? <><Loader2 className="animate-spin" /> Registrando...</> : <><Camera size={24} /> CONFIRMAR PONTO</>}
        </button>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-page text-text-secondary flex flex-col items-center justify-center p-4 pb-24 relative overflow-hidden font-sans" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

      <div className="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">

        <PushNotificationPrompt />

        {/* CABEÇALHO */}
        <div
          data-tour="emp-header"
          className="flex justify-between items-center bg-page backdrop-blur-xl p-5 rounded-2xl border border-border-default shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {session?.user?.name?.charAt(0) || <User />}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-page rounded-full"></div>
            </div>
            <div>
              <p className="text-xs text-text-muted font-bold uppercase tracking-widest mb-0.5">Olá, {session?.user?.name?.split(' ')[0]}</p>
              <h1 className="font-mono text-xl font-bold text-text-primary tracking-tight">{horaAtual || '--:--'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.dispatchEvent(new Event(FUNC_TOUR_RESTART_EVENT))}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 rounded-2xl text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 transition-all active:scale-95 text-xs font-bold"
            >
              <HelpCircle size={16} />
              Tutorial
            </button>
            <ThemeToggle className="p-3 rounded-2xl border border-border-subtle active:scale-95" />
            <button data-tour="emp-logout" onClick={() => { localStorage.removeItem('workid_rt'); signOut({ callbackUrl: '/login' }); }} className="p-3 bg-hover-bg hover:bg-red-500/20 rounded-2xl text-text-muted hover:text-red-400 border border-border-subtle hover:border-red-500/30 transition-all active:scale-95">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* STATUS DO EXPEDIENTE */}
        {location && !carregandoStatus && (() => {
          const info = getStatusInfo();
          const colors = statusColorMap[info.color];
          const Icon = info.icon;
          return (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${colors.bg} ${colors.border} animate-in fade-in slide-in-from-top-2`}>
              <div className="relative">
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} ${info.pulse ? 'animate-pulse' : ''}`} />
              </div>
              <Icon size={16} className={colors.text} />
              <span className={`text-sm font-bold ${colors.text} uppercase tracking-wider`}>{info.label}</span>
              {jaAlmocou && statusPonto !== 'SAIDA' && statusPonto && (
                <span className="ml-auto text-[10px] text-emerald-500/70 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Almoço registrado
                </span>
              )}
            </div>
          );
        })()}

        {/* PROGRESSO DO DIA */}
        {location && !carregandoStatus && statusPonto && statusPonto !== 'SAIDA' && metaMinutosHoje > 0 && (() => {
          const agora = new Date();
          // Calcula minutos trabalhados em tempo real (base da API + tempo desde última atualização)
          const minutosAtual = minutosTrabalhadosHoje;
          const porcentagem = Math.min(Math.round((minutosAtual / metaMinutosHoje) * 100), 100);
          const horasTrab = Math.floor(minutosAtual / 60);
          const minutosTrab = minutosAtual % 60;
          const horasMeta = Math.floor(metaMinutosHoje / 60);
          const minutosMeta = metaMinutosHoje % 60;

          // Previsão de saída
          let previsaoSaida = '';
          if (primeiraEntrada && jornadaHoje) {
            const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
            const diaAtual = diasSemana[agora.getDay()];
            const jornadaDia = jornadaHoje[diaAtual];
            if (jornadaDia?.ativo && jornadaDia.s2) {
              // Calcula: entrada real + meta de trabalho + tempo de almoço
              const parseHM = (h: string) => {
                if (!h || !/^\d{2}:\d{2}$/.test(h)) return 0;
                const [hh, mm] = h.split(':').map(Number);
                return hh * 60 + mm;
              };
              const e1Config = parseHM(jornadaDia.e1);
              const s1Config = parseHM(jornadaDia.s1);
              const e2Config = parseHM(jornadaDia.e2);
              const s2Config = parseHM(jornadaDia.s2);

              let tempoAlmoco = 0;
              if (s1Config && e2Config) {
                tempoAlmoco = e2Config - s1Config; // intervalo almoço configurado
              }

              const entradaMin = primeiraEntrada.getHours() * 60 + primeiraEntrada.getMinutes();
              const saidaPrevista = entradaMin + metaMinutosHoje + tempoAlmoco;
              const saidaHoras = Math.floor(saidaPrevista / 60);
              const saidaMinutos = saidaPrevista % 60;
              previsaoSaida = `${String(saidaHoras).padStart(2, '0')}:${String(saidaMinutos).padStart(2, '0')}`;
            }
          }

          const faltam = metaMinutosHoje - minutosAtual;
          const faltamH = Math.floor(Math.max(0, faltam) / 60);
          const faltamM = Math.max(0, faltam) % 60;

          return (
            <div className="bg-page backdrop-blur-md rounded-2xl border border-border-subtle p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
              {/* Barra de progresso */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} /> Progresso do dia
                </span>
                <span className={`font-bold tabular-nums ${porcentagem >= 100 ? 'text-emerald-400' : 'text-text-primary'}`}>
                  {porcentagem}%
                </span>
              </div>

              <div className="w-full h-3 bg-elevated-solid rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    porcentagem >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                    porcentagem >= 75 ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
                    'bg-gradient-to-r from-purple-600 to-purple-400'
                  }`}
                  style={{ width: `${porcentagem}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">
                  <span className="text-text-primary font-bold">{horasTrab}h{String(minutosTrab).padStart(2, '0')}</span>
                  {' / '}{horasMeta}h{String(minutosMeta).padStart(2, '0')}
                </span>
                {faltam > 0 ? (
                  <span className="text-text-faint">
                    Faltam <span className="text-text-muted font-semibold">{faltamH > 0 ? `${faltamH}h` : ''}{String(faltamM).padStart(2, '0')}min</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold">Meta atingida!</span>
                )}
              </div>

              {/* Previsão de saída e entrada */}
              {(previsaoSaida || primeiraEntrada) && (
                <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                  {primeiraEntrada && (
                    <span className="text-[11px] text-text-faint flex items-center gap-1">
                      <LogIn size={11} /> Entrada: <span className="text-text-muted font-semibold">{primeiraEntrada.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  )}
                  {previsaoSaida && (
                    <span className="text-[11px] text-text-faint flex items-center gap-1">
                      <LogOut size={11} /> Previsão: <span className="text-purple-400 font-bold">{previsaoSaida}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Alerta de café excedido */}
        {statusPonto === 'SAIDA_INTERVALO' && alertaIntervaloMostrado && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="bg-red-500/20 p-2 rounded-xl">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-red-400 font-bold text-sm">Pausa excedida!</p>
              <p className="text-red-400/70 text-xs">Seu café ultrapassou {(configs as any).duracaoPausaCafeMin || 15} minutos</p>
            </div>
          </div>
        )}

        {/* Alerta de almoço longo */}
        {statusPonto === 'SAIDA_ALMOCO' && ultimoPontoData && (() => {
          const diffAlmoco = Math.floor((new Date().getTime() - new Date(ultimoPontoData).getTime()) / 60000);
          // Calcula tempo de almoço configurado
          let tempoAlmocoConfig = 60; // default 1h
          if (jornadaHoje) {
            const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
            const diaAtual = diasSemana[new Date().getDay()];
            const jornadaDia = jornadaHoje[diaAtual];
            if (jornadaDia?.s1 && jornadaDia?.e2) {
              const parseHM = (h: string) => {
                if (!h || !/^\d{2}:\d{2}$/.test(h)) return 0;
                const [hh, mm] = h.split(':').map(Number);
                return hh * 60 + mm;
              };
              tempoAlmocoConfig = parseHM(jornadaDia.e2) - parseHM(jornadaDia.s1);
            }
          }
          if (diffAlmoco > tempoAlmocoConfig) {
            const excedeu = diffAlmoco - tempoAlmocoConfig;
            return (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="bg-orange-500/20 p-2 rounded-xl">
                  <AlertCircle size={20} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-orange-400 font-bold text-sm">Almoço excedido!</p>
                  <p className="text-orange-400/70 text-xs">{excedeu}min além do configurado ({Math.floor(tempoAlmocoConfig / 60)}h{tempoAlmocoConfig % 60 > 0 ? String(tempoAlmocoConfig % 60).padStart(2, '0') : ''})</p>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* ÁREA PRINCIPAL (CÂMERA/STATUS E AÇÃO) */}
        <div data-tour="emp-main" className="bg-page backdrop-blur-md rounded-[2rem] shadow-2xl overflow-hidden border border-border-subtle p-5 space-y-5">

          {statusMsg && (
            <div className={`p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 shadow-lg animate-in slide-in-from-top-2 ${statusMsg.tipo === 'erro' ? 'bg-red-500/20 text-red-200 border border-red-500/30' : statusMsg.tipo === 'sucesso' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-200 border border-blue-500/30'}`}>
              {statusMsg.tipo === 'erro' ? <AlertCircle size={18} /> : statusMsg.tipo === 'sucesso' ? <CheckCircle2 size={18} /> : <RefreshCcw size={18} className="animate-spin" />}
              {statusMsg.texto}
            </div>
          )}

          {/* Mapa Geofence */}
          {location && !carregandoStatus && configs.modoValidacaoPonto === 'GPS' && !configs.pontoLivre && configs.latitudeBase !== 0 && configs.longitudeBase !== 0 && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <button
                type="button"
                onClick={() => setMapaGeofenceAberto(!mapaGeofenceAberto)}
                className="w-full flex items-center justify-between text-xs text-text-muted font-bold uppercase tracking-wider mb-2 px-1 hover:text-text-secondary transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> Zona permitida
                </span>
                <span className="text-text-faint text-[10px] font-medium">
                  {mapaGeofenceAberto ? 'ocultar' : 'mostrar'}
                </span>
              </button>
              {mapaGeofenceAberto && (
                <MapaGeofence
                  latBase={configs.latitudeBase}
                  lngBase={configs.longitudeBase}
                  raio={configs.raioPermitido}
                  latAtual={location.lat}
                  lngAtual={location.lng}
                  locaisAdicionais={configs.locaisAdicionais || undefined}
                />
              )}
            </div>
          )}

          {/* Câmera / Status Display */}
          <div data-tour="emp-camera">
            {/* Webcam oculta (sempre montada para captura) */}
            {configs.exigirFoto && location && !cameraErro && (
              <div className={mostrarCamera ? '' : 'sr-only'}>
                <div className={`relative rounded-2xl overflow-hidden bg-black aspect-[4/3] border-2 shadow-inner border-purple-500/30 ring-1 ring-purple-500/20`}>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: 'user' }}
                    className="w-full h-full object-cover"
                    onUserMediaError={() => setCameraErro(true)}
                  />
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
                    AO VIVO
                  </div>
                </div>
              </div>
            )}

            {/* Câmera visível: placeholder sem GPS / erro */}
            {mostrarCamera && (!configs.exigirFoto || !location) && (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] border-2 shadow-inner border-purple-500/30 ring-1 ring-purple-500/20">
                <div className="absolute inset-0 flex items-center justify-center bg-input-solid/40 text-text-muted text-sm px-6 text-center">
                  A câmera aparece após permitir o GPS (se a empresa exigir foto).
                </div>
              </div>
            )}

            {/* Erro de câmera */}
            {mostrarCamera && cameraErro && configs.exigirFoto && location && (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] border-2 shadow-inner border-red-500/50">
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-solid text-center p-6">
                  <div className="bg-red-500/10 p-4 rounded-full mb-3">
                    <AlertCircle size={32} className="text-red-500" />
                  </div>
                  <p className="text-red-400 font-bold mb-1">Câmera Indisponível</p>
                  <p className="text-text-faint text-xs mb-4">Verifique as permissões do navegador</p>
                  <button
                    onClick={tentarRecuperarCamera}
                    className="bg-elevated-solid hover:bg-elevated-solid text-text-primary px-4 py-2 rounded-xl text-xs font-bold border border-border-input transition-colors"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            )}

            {/* Status Display (substitui câmera após bater ponto) */}
            {!mostrarCamera && location && !carregandoStatus && (
              <StatusDisplay />
            )}
          </div>

          <div data-tour="emp-actions" className="mt-2">
            {!location ? (
              <div className="py-8 flex flex-col items-center text-center">
                <div className="bg-purple-500/10 p-6 rounded-full mb-4 animate-bounce">
                  <MapPin size={40} className="text-purple-500" />
                </div>
                <h3 className="text-text-primary font-bold text-lg mb-2">Ativar Localização</h3>
                <p className="text-text-muted text-sm mb-6 max-w-[200px]">
                  Precisamos do seu GPS para validar o ponto.
                </p>

                <button
                  data-tour="emp-gps"
                  onClick={capturarLocalizacao}
                  className="w-full py-4 bg-white text-slate-900 hover:bg-slate-200 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"
                >
                  PERMITIR ACESSO
                </button>
              </div>
            ) : (
              <>
                {carregandoStatus ? (
                  <div className="py-10 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-border-input border-t-purple-500 rounded-full animate-spin mb-3"></div>
                    <p className="text-text-faint text-sm font-medium">Sincronizando...</p>
                  </div>
                ) : acaoPendente ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                    <p className="text-center text-sm text-text-muted font-medium">
                      Posicione seu rosto na câmera e confirme
                    </p>
                    <button
                      onClick={() => executarPonto(acaoPendente)}
                      disabled={loading}
                      className="w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 text-white bg-gradient-to-r from-purple-600 to-purple-500 disabled:opacity-70"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <><Camera size={24} /> CONFIRMAR</>}
                    </button>
                    <button
                      onClick={() => { setAcaoPendente(null); setMostrarCamera(false); }}
                      className="w-full py-3 rounded-xl font-medium text-sm text-text-muted hover:text-text-primary border border-border-subtle hover:bg-elevated/50 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  configs.fluxoEstrito ? renderizarBotoesInteligentes() : renderizarBotoesFlexiveis()
                )}
              </>
            )}
          </div>

        </div>

        {/* AÇÃO RÁPIDA */}
        <button data-tour="emp-forgot" onClick={abrirModalInclusao} className="w-full flex items-center justify-center gap-3 bg-surface/40 hover:bg-elevated/60 p-4 rounded-2xl border border-border-subtle transition-all active:scale-95 group backdrop-blur-sm cursor-pointer">
          <div className="bg-emerald-500/10 text-emerald-500 p-2.5 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors"><PlusCircle size={20} /></div>
          <span className="text-sm font-bold text-text-muted group-hover:text-text-primary">Esqueci de bater o Ponto</span>
        </button>

        {!configs.ocultarSaldoHoras && (
          <div className="text-center">
            <p className="text-[10px] text-text-dim font-medium bg-surface/30 inline-block px-3 py-1 rounded-full border border-border-subtle">
              Geolocalização Ativa &bull; WorkID
            </p>
          </div>
        )}

      </div>

      {/* MODAL DE CONFIRMAÇÃO DE AÇÃO CRÍTICA */}
      {modalConfirmacao && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setModalConfirmacao(null)} />
          <div className="relative z-10 w-full max-w-sm bg-page border border-red-500/20 shadow-2xl shadow-red-500/10 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-5 flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-2xl">
                <ShieldAlert size={28} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-text-primary font-bold text-lg">Tem certeza?</h3>
                <p className="text-red-400/70 text-xs mt-0.5">Ação requer confirmação</p>
              </div>
            </div>

            {/* Avisos */}
            <div className="px-6 py-5 space-y-3">
              {modalConfirmacao.avisos.map((aviso, i) => (
                <div key={i} className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-200 text-sm font-medium">{aviso}</p>
                </div>
              ))}

              <p className="text-text-muted text-sm text-center pt-2">
                Deseja encerrar o expediente mesmo assim?
              </p>
            </div>

            {/* Botões */}
            <div className="px-6 pb-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setModalConfirmacao(null)}
                className="py-4 rounded-xl font-bold text-sm bg-elevated-solid hover:bg-elevated-solid text-text-secondary border border-border-input transition-all active:scale-95"
              >
                Voltar
              </button>
              <button
                onClick={confirmarAcaoCritica}
                className="py-4 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 transition-all active:scale-95"
              >
                Sim, encerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INCLUSÃO */}
      {modalInclusaoAberto && (
        <div
          className="
            fixed inset-0 z-50 flex items-center justify-center
            px-4
            pt-[calc(1rem+env(safe-area-inset-top))]
            pb-[calc(1rem+env(safe-area-inset-bottom))]
          "
        >

          <div
            className="absolute inset-0 bg-overlay backdrop-blur-sm transition-opacity"
            onClick={() => setModalInclusaoAberto(false)}
          />
          <div
              data-tour="emp-modal-incluir"
              className="
                relative z-10 w-full md:max-w-sm
                bg-page border border-border-default shadow-2xl
                rounded-2xl
                px-6 pt-6
                pb-[calc(1.5rem+env(safe-area-inset-bottom))]
                max-h-[90dvh] overflow-y-auto
                space-y-5
                animate-in slide-in-from-bottom-10 fade-in duration-300
              "
            >

            <div data-tour="emp-header" className="flex justify-between items-center bg-page backdrop-blur-xl p-5 rounded-2xl border border-border-default shadow-2xl">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <PlusCircle size={20} className="text-emerald-400" /> Incluir Registro
              </h3>
              <button onClick={() => setModalInclusaoAberto(false)} className="text-text-faint hover:text-text-primary"><X size={20} /></button>
            </div>

            {/* ✅ AVISO VISUAL (FUNCIONA NO MOBILE) */}
            {avisoInclusao && (
              <div
                className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 shadow-lg
                ${avisoInclusao.tipo === 'erro'
                    ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                    : avisoInclusao.tipo === 'sucesso'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                  }`}
              >
                {avisoInclusao.tipo === 'erro'
                  ? <AlertCircle size={18} />
                  : avisoInclusao.tipo === 'sucesso'
                    ? <CheckCircle2 size={18} />
                    : <RefreshCcw size={18} className="animate-spin" />}
                <span className="leading-snug">{avisoInclusao.texto}</span>
              </div>
            )}

            {/* ✅ Botão explícito para ir ao Histórico (sem auto-navegar) */}
            {avisoInclusao?.pontoIdSugerido && (
              <button
                onClick={() => {
                  setModalInclusaoAberto(false);
                  const id = avisoInclusao.pontoIdSugerido!;
                  router.push(`/funcionario/historico?ajustar=${id}`);
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <History size={18} /> Ir para o Histórico e solicitar ajuste
              </button>
            )}

            {/* Sugestões inteligentes */}
            {carregandoSugestoes ? (
              <div className="flex items-center justify-center gap-2 py-3 text-text-muted text-xs">
                <Loader2 size={14} className="animate-spin" /> Verificando pontos faltantes...
              </div>
            ) : sugestoes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-text-faint font-bold uppercase ml-1">Pontos faltando</p>
                <div className="space-y-1.5">
                  {sugestoes.map((sug, idx) => {
                    const tipoCores: Record<string, string> = {
                      ENTRADA: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
                      SAIDA: 'text-red-400 border-red-500/30 bg-red-500/10',
                      SAIDA_ALMOCO: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
                      VOLTA_ALMOCO: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
                      SAIDA_INTERVALO: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
                      VOLTA_INTERVALO: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
                    };
                    const tipoLabels: Record<string, string> = {
                      ENTRADA: 'Entrada', SAIDA: 'Saída', SAIDA_ALMOCO: 'Almoço',
                      VOLTA_ALMOCO: 'Volta Almoço', SAIDA_INTERVALO: 'Saída Café', VOLTA_INTERVALO: 'Volta Café',
                    };
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => aplicarSugestao(sug)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 hover:brightness-110 ${tipoCores[sug.tipo] || 'text-text-muted border-border-subtle bg-surface'}`}
                      >
                        <div className="flex-1 text-left">
                          <p className="text-xs font-bold">{sug.label}</p>
                          <p className="text-[10px] opacity-70">{tipoLabels[sug.tipo] || sug.tipo} - {sug.horario}</p>
                        </div>
                        <span className="text-[10px] font-bold opacity-60">Usar</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-border-subtle" />
                  <span className="text-[10px] text-text-dim">ou preencha manualmente</span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-text-muted font-bold uppercase ml-1">Data</label>
                <input type="date" value={dataNova} onChange={e => setDataNova(e.target.value)} className="w-full bg-page border border-border-input p-3 rounded-xl text-text-primary text-sm text-center outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-text-muted font-bold uppercase ml-1">Tipo</label>
                <select
                  value={tipoNovo}
                  onChange={(e) => setTipoNovo(e.target.value as TipoSolicitacao)}
                  className="w-full bg-page border border-border-input p-3 rounded-xl text-text-primary text-sm outline-none focus:border-purple-500 appearance-none"
                >
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA_INTERVALO">Saída Café</option>
                  <option value="VOLTA_INTERVALO">Volta Café</option>
                  <option value="SAIDA_ALMOCO">Saída Almoço</option>
                  <option value="VOLTA_ALMOCO">Volta Almoço</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-text-muted font-bold uppercase ml-1">Novo Horário (HH:MM)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="00:00"
                value={horaNova}
                onChange={e => {
                  let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2);
                  setHoraNova(v);
                }}
                className="w-full bg-page border border-border-input p-4 rounded-2xl text-text-primary text-3xl font-bold text-center font-mono tracking-widest outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-text-muted font-bold uppercase ml-1">Justificativa (Obrigatório)</label>
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Esqueci de bater, estava em reunião..." className="w-full bg-page border border-border-input p-3 rounded-xl text-text-primary text-sm h-24 resize-none outline-none focus:border-purple-500 transition-colors" />
            </div>
            <button data-tour="emp-send-request" onClick={enviarSolicitacaoInclusao} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-purple-900/20 active:scale-95 transition-all flex items-center justify-center gap-2">
              <Save size={18} /> Enviar Solicitação
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
