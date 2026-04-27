'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound } from 'lucide-react';

const STORAGE_KEY = 'workid_totem_token';
const STORAGE_KEY_INFO = 'workid_totem_info';

export default function PararTotemPage() {
  const router = useRouter();
  const [digitos, setDigitos] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Se já está pareado, vai pro kiosk
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tok = window.localStorage.getItem(STORAGE_KEY);
    if (tok) router.replace('/totem');
  }, [router]);

  const handleChange = (idx: number, valor: string) => {
    const v = valor.replace(/\D/g, '').slice(0, 1);
    const novo = [...digitos];
    novo[idx] = v;
    setDigitos(novo);
    setErro(null);
    if (v && idx < 5) refs.current[idx + 1]?.focus();
    if (novo.every(d => d !== '')) submeter(novo.join(''));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digitos[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (t.length === 6) {
      setDigitos(t.split(''));
      submeter(t);
    }
  };

  const submeter = async (codigo: string) => {
    if (loading) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch('/api/totem/ativar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        window.localStorage.setItem(STORAGE_KEY, data.token);
        window.localStorage.setItem(STORAGE_KEY_INFO, JSON.stringify({
          totemNome: data.totemNome,
          empresaNome: data.empresaNome,
          totemId: data.totemId,
        }));
        router.replace('/totem');
      } else {
        setErro(data?.erro || 'Código inválido.');
        setDigitos(['', '', '', '', '', '']);
        setTimeout(() => refs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setErro('Sem conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1535] to-[#0a0e27] text-white flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 mb-6">
          <KeyRound size={32} className="text-purple-300" />
        </div>

        <h1 className="text-3xl font-extrabold mb-2">Modo Totem WorkID</h1>
        <p className="text-white/60 mb-8">
          Digite o código de 6 dígitos gerado no painel do administrador.
        </p>

        <div className="flex gap-2 justify-center mb-6">
          {digitos.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              value={d}
              inputMode="numeric"
              maxLength={1}
              autoFocus={i === 0}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              disabled={loading}
              className="w-12 h-16 sm:w-14 sm:h-20 text-3xl text-center font-extrabold tabular-nums rounded-xl bg-white/5 border-2 border-purple-500/30 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          ))}
        </div>

        {loading && (
          <div className="text-purple-300 inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Validando...
          </div>
        )}
        {erro && !loading && (
          <p className="text-red-400 text-sm">{erro}</p>
        )}

        <p className="mt-12 text-xs text-white/40">
          Para gerar um código, peça ao administrador para acessar Painel → Totens.
        </p>
      </div>
    </div>
  );
}
