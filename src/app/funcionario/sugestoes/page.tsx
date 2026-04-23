'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { format, getDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ArrowLeft, Lightbulb, Clock, LogIn, LogOut,
  Coffee, UtensilsCrossed, CheckCircle2, AlertCircle,
} from 'lucide-react';

type Sugestao = { data: string; tipo: string; horario: string; label: string };

const TIPO_META: Record<string, { label: string; icon: any; cor: string; bg: string }> = {
  ENTRADA: { label: 'Entrada', icon: LogIn, cor: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  SAIDA: { label: 'Saída', icon: LogOut, cor: 'text-red-400', bg: 'bg-red-500/10' },
  SAIDA_ALMOCO: { label: 'Almoço', icon: UtensilsCrossed, cor: 'text-orange-400', bg: 'bg-orange-500/10' },
  VOLTA_ALMOCO: { label: 'Volta Almoço', icon: LogIn, cor: 'text-blue-400', bg: 'bg-blue-500/10' },
  SAIDA_INTERVALO: { label: 'Café', icon: Coffee, cor: 'text-amber-400', bg: 'bg-amber-500/10' },
};

function detectar(pontos: any[], jornada: any, feriados: string[], diasBusca: number): Sugestao[] {
  if (!jornada || !pontos) return [];
  const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const hoje = new Date();
  const out: Sugestao[] = [];

  for (let d = 0; d < diasBusca; d++) {
    const dia = subDays(hoje, d);
    const diaStr = format(dia, 'yyyy-MM-dd');
    const diaSemana = diasMap[getDay(dia)];
    const configDia = jornada[diaSemana];
    if (!configDia || !configDia.ativo) continue;
    if (feriados.includes(diaStr)) continue;

    const pontosDoDia = pontos
      .filter(p => p.tipo !== 'AUSENCIA' && format(new Date(p.dataHora), 'yyyy-MM-dd') === diaStr)
      .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
    const tipos = new Set(pontosDoDia.map(p => p.subTipo || p.tipo));
    const isHoje = d === 0;
    const jornadaContinua = !configDia.s1 || !/^\d{2}:\d{2}$/.test(configDia.s1);

    // Determina quais tipos são obrigatórios para esse dia (conforme jornada)
    const obrigatorios: Array<{ tipo: string; horarioDefault: string; horarioConfig?: string }> = [];
    obrigatorios.push({ tipo: 'ENTRADA', horarioConfig: configDia.e1, horarioDefault: '08:00' });
    if (!jornadaContinua) {
      obrigatorios.push({ tipo: 'SAIDA_ALMOCO', horarioConfig: configDia.s1, horarioDefault: '12:00' });
      obrigatorios.push({ tipo: 'VOLTA_ALMOCO', horarioConfig: configDia.e2, horarioDefault: '13:00' });
    }
    obrigatorios.push({ tipo: 'SAIDA', horarioConfig: configDia.s2, horarioDefault: '18:00' });

    // Pula SAIDA (e pontos posteriores) se for hoje — ainda não passou do expediente
    for (const ob of obrigatorios) {
      if (tipos.has(ob.tipo)) continue;
      // Se é hoje, só sugere pontos cujo horário já passou
      if (isHoje) {
        const hor = ob.horarioConfig || ob.horarioDefault;
        const [hh, mm] = hor.split(':').map(Number);
        const horaMin = hh * 60 + mm;
        const agoraMin = hoje.getHours() * 60 + hoje.getMinutes();
        if (agoraMin < horaMin) continue;
      }
      const label = ({
        ENTRADA: 'Entrada',
        SAIDA_ALMOCO: 'Almoço',
        VOLTA_ALMOCO: 'Volta almoço',
        SAIDA: 'Saída',
      } as any)[ob.tipo];
      out.push({
        data: diaStr,
        tipo: ob.tipo,
        horario: ob.horarioConfig || ob.horarioDefault,
        label: `${label} em ${format(dia, 'dd/MM')}`,
      });
    }
  }

  return out;
}

export default function SugestoesPage() {
  const [loading, setLoading] = useState(true);
  const [pontos, setPontos] = useState<any[]>([]);
  const [jornada, setJornada] = useState<any>(null);
  const [feriados, setFeriados] = useState<string[]>([]);
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<any[]>([]);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [enviadas, setEnviadas] = useState<Set<string>>(new Set());
  const [enviandoTodas, setEnviandoTodas] = useState(false);
  const [diasBusca, setDiasBusca] = useState(30);

  const carregar = async () => {
    setLoading(true);
    try {
      const fim = format(new Date(), 'yyyy-MM-dd');
      const inicio = format(subDays(new Date(), diasBusca), 'yyyy-MM-dd');
      const [hist, sol] = await Promise.all([
        axios.get(`/api/funcionario/historico?inicio=${inicio}&fim=${fim}`),
        axios.get('/api/funcionario/minhas-solicitacoes'),
      ]);
      setPontos(hist.data.pontos || []);
      setJornada(hist.data.jornada || null);
      setFeriados(hist.data.feriados || []);
      setSolicitacoesPendentes(
        (sol.data || []).filter((s: any) => s.status === 'PENDENTE')
      );
    } catch {
      toast.error('Erro ao carregar sugestões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [diasBusca]);

  const sugestoes = useMemo(() => detectar(pontos, jornada, feriados, diasBusca), [pontos, jornada, feriados, diasBusca]);

  // Filtra sugestões que já têm solicitação pendente
  const sugestoesFiltradas = sugestoes.filter(sug => {
    const chave = `${sug.data}-${sug.tipo}`;
    if (enviadas.has(chave)) return false;
    const temPendente = solicitacoesPendentes.some(s =>
      !s.pontoId &&
      s.tipo === sug.tipo &&
      format(new Date(s.novoHorario), 'yyyy-MM-dd') === sug.data
    );
    return !temPendente;
  });

  const enviarUma = async (sug: Sugestao): Promise<{ ok: boolean; autoGestao?: boolean; erro?: string }> => {
    const chave = `${sug.data}-${sug.tipo}`;
    const motivo = motivos[chave]?.trim() || 'Esqueci de bater o ponto';
    try {
      const dataHora = new Date(`${sug.data}T${sug.horario}:00`);
      const res = await axios.post('/api/funcionario/solicitar-ajuste', {
        pontoId: null,
        tipo: sug.tipo,
        novoHorario: dataHora.toISOString(),
        motivo,
      });
      setEnviadas(prev => new Set(prev).add(chave));
      return { ok: true, autoGestao: !!res.data?.autoGestao };
    } catch (err: any) {
      return { ok: false, erro: err?.response?.data?.erro || 'Erro ao enviar' };
    }
  };

  const enviar = async (sug: Sugestao) => {
    const chave = `${sug.data}-${sug.tipo}`;
    setEnviando(chave);
    const r = await enviarUma(sug);
    setEnviando(null);
    if (r.ok) toast.success(r.autoGestao ? 'Ponto incluído!' : 'Solicitação enviada ao admin');
    else toast.error(r.erro || 'Erro ao enviar');
  };

  const enviarTodas = async () => {
    if (sugestoesFiltradas.length === 0) return;
    setEnviandoTodas(true);
    let ok = 0;
    let fail = 0;
    for (const sug of sugestoesFiltradas) {
      const r = await enviarUma(sug);
      if (r.ok) ok++; else fail++;
    }
    setEnviandoTodas(false);
    if (fail === 0) toast.success(`${ok} ${ok === 1 ? 'solicitação enviada' : 'solicitações enviadas'}`);
    else toast.warning(`${ok} enviada(s), ${fail} falhou(aram)`);
  };

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden pb-24" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[400px] h-[400px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 relative z-10">
        <div className="flex items-center gap-3">
          <Link href="/funcionario" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong rounded-xl border border-border-subtle transition-all active:scale-95" title="Voltar">
            <ArrowLeft size={20} />
          </Link>
          <div className="bg-amber-500/15 p-2 rounded-xl border border-amber-500/20">
            <Lightbulb size={22} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Pontos que faltam</h1>
            <p className="text-text-muted text-xs">Detectamos automaticamente dias com pontos esquecidos.</p>
          </div>
        </div>

        {/* Filtro de período */}
        <div className="bg-surface backdrop-blur-sm border border-border-subtle rounded-2xl p-3 flex items-center gap-3">
          <label className="text-xs text-text-muted font-semibold">Buscar nos últimos</label>
          <select
            value={diasBusca}
            onChange={e => setDiasBusca(Number(e.target.value))}
            className="bg-page border border-border-input rounded-xl px-3 py-2 text-sm text-text-primary focus:border-purple-500 outline-none"
          >
            <option value={7}>7 dias</option>
            <option value={15}>15 dias</option>
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
            <option value={90}>90 dias</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-hover-bg rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : sugestoesFiltradas.length === 0 ? (
          <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-10 text-center">
            <div className="w-14 h-14 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-text-primary">Tudo em ordem!</p>
            <p className="text-xs text-text-muted mt-1">Nenhum ponto pendente nos últimos {diasBusca} dias.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase font-bold text-text-dim tracking-wider">
                {sugestoesFiltradas.length} sugest{sugestoesFiltradas.length === 1 ? 'ão' : 'ões'} encontrada{sugestoesFiltradas.length === 1 ? '' : 's'}
              </p>
              {sugestoesFiltradas.length > 1 && (
                <button
                  onClick={enviarTodas}
                  disabled={enviandoTodas || !!enviando}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                  {enviandoTodas ? 'Enviando...' : <><CheckCircle2 size={14} /> Enviar todas ({sugestoesFiltradas.length})</>}
                </button>
              )}
            </div>

            {sugestoesFiltradas.map(sug => {
              const chave = `${sug.data}-${sug.tipo}`;
              const meta = TIPO_META[sug.tipo] || TIPO_META.ENTRADA;
              const Icon = meta.icon;
              const dataObj = new Date(`${sug.data}T12:00:00`);
              const diaSemana = format(dataObj, 'EEEE', { locale: ptBR });
              const dataLegivel = format(dataObj, "dd 'de' MMMM", { locale: ptBR });
              const isEnviando = enviando === chave;

              return (
                <div key={chave} className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle overflow-hidden">
                  <div className="p-4 flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${meta.bg} shrink-0`}>
                      <Icon size={18} className={meta.cor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase ${meta.cor}`}>{meta.label}</span>
                        <span className="text-[10px] text-text-dim bg-elevated px-2 py-0.5 rounded-lg font-medium capitalize">
                          {diaSemana}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-text-primary mt-1">{dataLegivel}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock size={12} className="text-text-dim" />
                        <span className="text-xs text-text-muted">Horário sugerido: <span className="font-semibold text-text-secondary font-mono">{sug.horario}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle p-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Motivo (opcional — padrão: Esqueci de bater)"
                      value={motivos[chave] || ''}
                      onChange={e => setMotivos(prev => ({ ...prev, [chave]: e.target.value }))}
                      className="w-full bg-page border border-border-input rounded-xl px-3 py-2 text-sm text-text-primary focus:border-purple-500 outline-none"
                    />
                    <button
                      onClick={() => enviar(sug)}
                      disabled={isEnviando || enviandoTodas}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      {isEnviando ? 'Enviando...' : 'Solicitar inclusão'}
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300/80">
                As solicitações passam por aprovação do admin, a menos que a empresa permita auto-gestão.
                Você pode acompanhar o status na aba <strong>Solicitações</strong> do Histórico.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
