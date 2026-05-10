'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
} from 'lucide-react';

type Agendamento = {
  id: string;
  dataHora: string;
  duracaoMinutos: number;
  status: string;
  nome: string | null;
  diaFormatado: string;
  horario: string;
};

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  PENDENTE:   { label: 'Aguardando confirmação', cor: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  CONFIRMADO: { label: 'Confirmado',             cor: 'text-blue-300 border-blue-500/30 bg-blue-500/10' },
  REALIZADO:  { label: 'Já realizado',           cor: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  CANCELADO:  { label: 'Cancelado',              cor: 'text-slate-300 border-slate-500/30 bg-slate-500/10' },
  NO_SHOW:    { label: 'Não compareceu',         cor: 'text-red-300 border-red-500/30 bg-red-500/10' },
};

function diaToISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getProximosDias(qtd: number) {
  const dias: Date[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (dias.length < qtd) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 6) dias.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

export default function AgendamentoPublico() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const token = search.get('t') || '';

  const [ag, setAg] = useState<Agendamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [modo, setModo] = useState<'view' | 'cancelar' | 'reagendar'>('view');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [motivo, setMotivo] = useState('');

  // Reagendar
  const [dataNova, setDataNova] = useState<Date | null>(null);
  const [horarioNovo, setHorarioNovo] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [carregandoSlots, setCarregandoSlots] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/agendamento/${params.id}?t=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErro(data?.erro || 'Link inválido.');
      } else {
        setAg(data.agendamento);
      }
    } catch {
      setErro('Falha de conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params?.id) carregar();
    // eslint-disable-next-line
  }, [params?.id, token]);

  useEffect(() => {
    if (modo !== 'reagendar' || !dataNova) {
      setSlots([]);
      return;
    }
    const dia = diaToISO(dataNova);
    setCarregandoSlots(true);
    setHorarioNovo('');
    fetch(`/api/public/horarios-disponiveis?dia=${dia}`)
      .then(r => r.json())
      .then(d => setSlots(Array.isArray(d?.slots) ? d.slots : []))
      .catch(() => setSlots([]))
      .finally(() => setCarregandoSlots(false));
  }, [dataNova, modo]);

  const cancelar = async () => {
    if (!ag) return;
    setSalvando(true);
    setAviso('');
    try {
      const res = await fetch(`/api/public/agendamento/${ag.id}?t=${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancelar', motivo }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setAviso(data?.erro || 'Não foi possível cancelar.');
      } else {
        setAg(data.agendamento);
        setModo('view');
        setAviso('Agendamento cancelado.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const reagendar = async () => {
    if (!ag || !dataNova || !horarioNovo) return;
    setSalvando(true);
    setAviso('');
    try {
      const res = await fetch(`/api/public/agendamento/${ag.id}?t=${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reagendar', dia: diaToISO(dataNova), horario: horarioNovo }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setAviso(data?.erro || 'Esse horário foi pego. Escolha outro.');
        setHorarioNovo('');
        // Recarrega disponíveis
        try {
          const r2 = await fetch(`/api/public/horarios-disponiveis?dia=${diaToISO(dataNova)}`);
          const d2 = await r2.json();
          setSlots(Array.isArray(d2?.slots) ? d2.slots : []);
        } catch { /* ignore */ }
        return;
      }
      if (!res.ok || !data?.ok) {
        setAviso(data?.erro || 'Não foi possível reagendar.');
      } else {
        setAg(data.agendamento);
        setModo('view');
        setDataNova(null);
        setHorarioNovo('');
        setAviso('Reagendado com sucesso.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const dias = getProximosDias(10);
  const status = ag ? STATUS_LABEL[ag.status] || { label: ag.status, cor: 'text-slate-300' } : null;
  const podeMexer = ag && !['REALIZADO', 'CANCELADO', 'NO_SHOW'].includes(ag.status);

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-purple-500/10 bg-[#0a0e27]/80 backdrop-blur-xl">
        <nav className="container mx-auto flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="WorkID" width={40} height={40} className="rounded-xl" />
            <span className="text-xl font-extrabold text-white">WorkID</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <ArrowLeft size={16} /> Site
          </Link>
        </nav>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        {loading && (
          <div className="text-center text-gray-400 py-20">
            <Loader2 className="animate-spin mx-auto mb-3" />
            Carregando…
          </div>
        )}

        {!loading && erro && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center text-red-300">
            <XCircle className="mx-auto mb-3" />
            <p className="font-bold mb-1">Link inválido</p>
            <p className="text-sm text-gray-400">{erro}</p>
          </div>
        )}

        {!loading && ag && status && (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                Sua demo do <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">WorkID</span>
              </h1>
              {ag.nome && <p className="text-gray-400 mt-1">Olá, {ag.nome.split(' ')[0]}!</p>}
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-6 md:p-8 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold ${status.cor}`}>
                  {status.label}
                </span>
                <span className="text-xs text-gray-500">#{ag.id.slice(-8)}</span>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-3 text-purple-300">
                  <Calendar size={22} />
                </div>
                <div>
                  <p className="text-sm text-gray-400 capitalize">{ag.diaFormatado}</p>
                  <p className="text-3xl font-extrabold text-white flex items-center gap-2">
                    <Clock size={20} className="text-gray-500" /> {ag.horario}
                    <span className="text-xs font-normal text-gray-600">· {ag.duracaoMinutos} min</span>
                  </p>
                </div>
              </div>

              {aviso && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-200">
                  {aviso}
                </div>
              )}

              {!podeMexer && (
                <p className="text-sm text-gray-500 italic">
                  Esse agendamento não pode mais ser modificado.
                </p>
              )}
            </div>

            {podeMexer && modo === 'view' && (
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => { setModo('reagendar'); setAviso(''); }}
                  className="py-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-200 font-bold hover:bg-purple-500/20 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} /> Reagendar
                </button>
                <button
                  onClick={() => { setModo('cancelar'); setAviso(''); }}
                  className="py-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 font-bold hover:bg-red-500/20 flex items-center justify-center gap-2"
                >
                  <XCircle size={18} /> Cancelar
                </button>
              </div>
            )}

            {modo === 'cancelar' && podeMexer && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/5 p-5 space-y-4">
                <h3 className="font-bold text-white">Cancelar este agendamento?</h3>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Motivo (opcional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0e27]/60 border border-purple-500/20 text-sm text-white placeholder:text-gray-600"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setModo('view')}
                    className="px-4 py-2 rounded-xl border border-gray-600 text-gray-300 text-sm"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={cancelar}
                    disabled={salvando}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-60"
                  >
                    {salvando ? 'Cancelando…' : 'Confirmar cancelamento'}
                  </button>
                </div>
              </div>
            )}

            {modo === 'reagendar' && podeMexer && (
              <div className="mt-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-4">
                <h3 className="font-bold text-white">Escolha o novo horário</h3>

                <div className="grid grid-cols-5 gap-2">
                  {dias.map((d, i) => {
                    const sel = dataNova?.toDateString() === d.toDateString();
                    return (
                      <button
                        key={i}
                        onClick={() => setDataNova(d)}
                        className={`py-3 rounded-xl border text-center min-h-[60px] ${
                          sel ? 'bg-purple-600 border-purple-500 text-white' : 'bg-[#0a0e27]/40 border-purple-500/20 text-gray-400 hover:border-purple-500/40'
                        }`}
                      >
                        <p className="text-[10px] uppercase font-bold">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</p>
                        <p className="text-sm font-bold mt-0.5">{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                      </button>
                    );
                  })}
                </div>

                {dataNova && (
                  carregandoSlots ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                      <Loader2 size={16} className="animate-spin" /> Buscando horários…
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">Sem horários nesse dia.</p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {slots.map(h => {
                        const sel = horarioNovo === h;
                        return (
                          <button
                            key={h}
                            onClick={() => setHorarioNovo(h)}
                            className={`py-3 rounded-xl border font-bold text-sm ${
                              sel ? 'bg-purple-600 border-purple-500 text-white' : 'bg-[#0a0e27]/40 border-purple-500/20 text-gray-400 hover:border-purple-500/40'
                            }`}
                          >
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  )
                )}

                <div className="flex gap-2 justify-end pt-2 border-t border-purple-500/10">
                  <button
                    onClick={() => { setModo('view'); setDataNova(null); setHorarioNovo(''); }}
                    className="px-4 py-2 rounded-xl border border-gray-600 text-gray-300 text-sm"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={reagendar}
                    disabled={salvando || !dataNova || !horarioNovo}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {salvando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Confirmar novo horário
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
