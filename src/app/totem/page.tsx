'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'workid_totem_token';
const STORAGE_KEY_INFO = 'workid_totem_info';

type Sessao = {
  token: string;
  totemNome: string;
  empresaNome: string;
};

type Estado =
  | { fase: 'idle' }
  | { fase: 'capturando' }
  | { fase: 'enviando' }
  | { fase: 'sucesso'; nome: string; tipoLabel: string; horario: string }
  | { fase: 'erro'; mensagem: string };

function relogio(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function dataExtenso(d: Date) {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

export default function TotemPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [estado, setEstado] = useState<Estado>({ fase: 'idle' });
  const [agora, setAgora] = useState(new Date());
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Carrega sessão ou redireciona pra parear
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tok = window.localStorage.getItem(STORAGE_KEY);
    const info = window.localStorage.getItem(STORAGE_KEY_INFO);
    if (!tok) {
      router.replace('/totem/parear');
      return;
    }
    setSessao({
      token: tok,
      totemNome: info ? JSON.parse(info).totemNome : 'Totem',
      empresaNome: info ? JSON.parse(info).empresaNome : '',
    });
  }, [router]);

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Para câmera ao desmontar
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const pararCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const enviarFoto = useCallback(async (fotoBase64: string) => {
    if (!sessao) return;
    setEstado({ fase: 'enviando' });
    try {
      const res = await fetch('/api/totem/bater-ponto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessao.token}`,
        },
        body: JSON.stringify({ fotoBase64 }),
      });
      const data = await res.json();
      pararCamera();

      if (res.ok && data?.ok) {
        setEstado({
          fase: 'sucesso',
          nome: data.usuarioNome,
          tipoLabel: data.tipoLabel,
          horario: data.horario,
        });
        // volta pro idle em 5s
        setTimeout(() => setEstado({ fase: 'idle' }), 5000);
      } else if (res.status === 401) {
        // token inválido — volta pra pareamento
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(STORAGE_KEY_INFO);
        router.replace('/totem/parear');
      } else {
        setEstado({
          fase: 'erro',
          mensagem: data?.mensagem || data?.erro || 'Não consegui registrar. Tente novamente.',
        });
        setTimeout(() => setEstado({ fase: 'idle' }), 4000);
      }
    } catch (err) {
      pararCamera();
      setEstado({ fase: 'erro', mensagem: 'Sem conexão. Verifique a internet.' });
      setTimeout(() => setEstado({ fase: 'idle' }), 4000);
    }
  }, [sessao, pararCamera, router]);

  const tirarFoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    enviarFoto(dataUrl);
  }, [enviarFoto]);

  const iniciarCaptura = useCallback(async () => {
    setEstado({ fase: 'capturando' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Countdown 3..2..1..captura
      for (let n = 3; n >= 1; n--) {
        setCountdown(n);
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown(null);
      tirarFoto();
    } catch (err) {
      console.error(err);
      setEstado({ fase: 'erro', mensagem: 'Não consegui acessar a câmera. Verifique permissões.' });
      setTimeout(() => setEstado({ fase: 'idle' }), 4000);
    }
  }, [tirarFoto]);

  if (!sessao) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center text-white">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1535] to-[#0a0e27] text-white relative overflow-hidden">
      {/* Grid decorativo */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header — empresa + totem */}
      <header className="relative z-10 px-8 pt-6 flex items-center justify-between">
        <div>
          <div className="text-sm uppercase tracking-widest text-purple-300/80">{sessao.empresaNome}</div>
          <div className="text-xs text-white/40 mt-0.5">Totem: {sessao.totemNome}</div>
        </div>
        <button
          onClick={() => {
            if (!confirm('Sair do modo Totem? Você precisará parear de novo.')) return;
            window.localStorage.removeItem(STORAGE_KEY);
            window.localStorage.removeItem(STORAGE_KEY_INFO);
            router.replace('/totem/parear');
          }}
          className="text-xs text-white/30 hover:text-white/60"
        >
          sair
        </button>
      </header>

      {/* Conteúdo central */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-8">
        {/* Estado IDLE — botão grande de bater ponto */}
        {estado.fase === 'idle' && (
          <div className="text-center w-full max-w-2xl">
            <div className="text-7xl md:text-8xl font-extrabold tabular-nums tracking-tight">
              {relogio(agora)}
            </div>
            <div className="mt-3 text-lg text-white/50 capitalize">{dataExtenso(agora)}</div>

            <button
              onClick={iniciarCaptura}
              className="mt-12 w-full max-w-md mx-auto px-12 py-10 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 active:scale-95 transition-all shadow-2xl shadow-purple-500/40 flex flex-col items-center gap-4"
            >
              <Camera size={64} />
              <span className="text-3xl font-extrabold">BATER PONTO</span>
            </button>

            <p className="mt-8 text-sm text-white/40">
              Aproxime o rosto da câmera quando solicitado
            </p>
          </div>
        )}

        {/* Estado CAPTURANDO — câmera ativa */}
        {estado.fase === 'capturando' && (
          <div className="relative w-full max-w-3xl flex flex-col items-center">
            <div className="relative w-full aspect-[4/3] bg-black rounded-3xl overflow-hidden border-2 border-purple-500/30 shadow-2xl shadow-purple-500/40">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover [transform:scaleX(-1)]"
              />
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="text-9xl font-black text-white drop-shadow-[0_4px_24px_rgba(168,85,247,0.8)]">
                    {countdown}
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <p className="mt-6 text-2xl font-semibold">Olhe pra câmera</p>
          </div>
        )}

        {/* Estado ENVIANDO */}
        {estado.fase === 'enviando' && (
          <div className="text-center">
            <Loader2 size={80} className="animate-spin mx-auto text-purple-400" />
            <p className="mt-6 text-3xl font-bold">Identificando...</p>
          </div>
        )}

        {/* Estado SUCESSO */}
        {estado.fase === 'sucesso' && (
          <div className="text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-emerald-500/20 mb-6">
              <CheckCircle2 size={80} className="text-emerald-400" />
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-3">
              Olá, {estado.nome.split(' ')[0]}!
            </h1>
            <p className="text-2xl text-white/80 mb-2">{estado.tipoLabel} registrada</p>
            <div className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-full bg-white/5 border border-white/10">
              <Clock size={20} className="text-purple-300" />
              <span className="text-2xl font-bold tabular-nums">{estado.horario}</span>
            </div>
          </div>
        )}

        {/* Estado ERRO */}
        {estado.fase === 'erro' && (
          <div className="text-center animate-in fade-in duration-300">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-red-500/20 mb-6">
              <AlertCircle size={80} className="text-red-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Não deu certo</h1>
            <p className="text-xl text-white/70 max-w-xl mx-auto">{estado.mensagem}</p>
          </div>
        )}
      </main>
    </div>
  );
}
