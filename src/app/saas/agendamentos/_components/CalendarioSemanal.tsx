'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  User as UserIcon,
  MessageCircle,
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  Briefcase,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { addDays, startOfWeek } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const TZ = 'America/Sao_Paulo';

const JANELAS: Record<number, { inicio: number; fim: number } | null> = {
  0: null,
  1: { inicio: 9, fim: 21 },
  2: { inicio: 9, fim: 21 },
  3: { inicio: 9, fim: 21 },
  4: { inicio: 9, fim: 21 },
  5: { inicio: 9, fim: 21 },
  6: { inicio: 9, fim: 15 },
};

const HORARIOS_GRADE: string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h < 21; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
})();

type LeadResumo = {
  id: string;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  empresa: string | null;
  origem: string;
  obs: string | null;
  criadoEm: string;
};

export type Agendamento = {
  id: string;
  dataHora: string;
  duracaoMinutos: number;
  status: string;
  atendenteId: string | null;
  leadId: string | null;
  alteradoPor: string | null;
  alteradoEm: string | null;
  observacao: string | null;
  criadoEm: string;
  lead: LeadResumo | null;
};

type Props = {
  agendamentos: Agendamento[];
  onAtualizar: (id: string, patch: { status?: string; observacao?: string }) => Promise<void>;
  salvandoId: string | null;
};

const STATUS_CORES: Record<string, { bloco: string; texto: string; ponto: string }> = {
  PENDENTE:   { bloco: 'bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30',   texto: 'text-amber-100',    ponto: 'bg-amber-400'   },
  CONFIRMADO: { bloco: 'bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30',      texto: 'text-blue-100',     ponto: 'bg-blue-400'    },
  REALIZADO:  { bloco: 'bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30', texto: 'text-emerald-100', ponto: 'bg-emerald-400' },
  CANCELADO:  { bloco: 'bg-slate-700/40 border-slate-600/40 hover:bg-slate-700/60 line-through opacity-60', texto: 'text-slate-300', ponto: 'bg-slate-500' },
  NO_SHOW:    { bloco: 'bg-red-500/20 border-red-500/40 hover:bg-red-500/30',         texto: 'text-red-100',      ponto: 'bg-red-400'     },
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  CONFIRMADO: 'Confirmado',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado',
  NO_SHOW: 'No-show',
};

function whatsappLink(numero: string | null) {
  if (!numero) return '';
  const digits = numero.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('55') ? digits : '55' + digits}`;
}

function diaForaDaJanela(diaSemana: number, horario: string): boolean {
  const j = JANELAS[diaSemana];
  if (!j) return true;
  const [h, m] = horario.split(':').map(Number);
  const minutos = h * 60 + m;
  return minutos < j.inicio * 60 || minutos >= j.fim * 60;
}

export default function CalendarioSemanal({ agendamentos, onAtualizar, salvandoId }: Props) {
  const [semanaInicio, setSemanaInicio] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selecionado, setSelecionado] = useState<Agendamento | null>(null);
  const [obsTexto, setObsTexto] = useState('');
  const [editandoNota, setEditandoNota] = useState(false);

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i)),
    [semanaInicio]
  );

  const hojeStr = useMemo(
    () => formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd'),
    []
  );

  // (yyyy-MM-dd|HH:mm) -> agendamentos que caem nesse slot.
  // Cancelados ficam fora do calendário (vão pra Lista) pra não poluir a agenda visual.
  const indice = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    for (const a of agendamentos) {
      if (a.status === 'CANCELADO') continue;
      const dt = new Date(a.dataHora);
      const dia = formatInTimeZone(dt, TZ, 'yyyy-MM-dd');
      const hh = Number(formatInTimeZone(dt, TZ, 'HH'));
      const mm = Number(formatInTimeZone(dt, TZ, 'mm'));
      // Snap pra slot de 30min mais próximo abaixo
      const slotMin = mm < 30 ? '00' : '30';
      const hora = `${String(hh).padStart(2, '0')}:${slotMin}`;
      const key = `${dia}|${hora}`;
      const arr = map.get(key) || [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [agendamentos]);

  const labelSemana = useMemo(() => {
    const ini = formatInTimeZone(semanaInicio, TZ, "d 'de' MMM", { locale: ptBR });
    const fim = formatInTimeZone(addDays(semanaInicio, 6), TZ, "d 'de' MMM", { locale: ptBR });
    return `${ini} – ${fim}`;
  }, [semanaInicio]);

  const irPraHoje = () => setSemanaInicio(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const semanaAnterior = () => setSemanaInicio(prev => addDays(prev, -7));
  const semanaProxima = () => setSemanaInicio(prev => addDays(prev, 7));

  const abrirModal = (a: Agendamento) => {
    setSelecionado(a);
    setObsTexto(a.observacao || '');
    setEditandoNota(false);
  };
  const fecharModal = () => {
    setSelecionado(null);
    setEditandoNota(false);
  };

  // Mantém o agendamento selecionado em sincronia com a lista após updates
  const selecionadoAtual = useMemo(() => {
    if (!selecionado) return null;
    return agendamentos.find(a => a.id === selecionado.id) || selecionado;
  }, [selecionado, agendamentos]);

  return (
    <div className="space-y-3">
      {/* Header de navegação */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-subtle bg-elevated/40 p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={semanaAnterior}
            className="p-2 rounded-xl border border-border-subtle hover:bg-elevated-solid/50 text-text-secondary"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={irPraHoje}
            className="px-3 py-2 rounded-xl border border-border-subtle hover:bg-elevated-solid/50 text-sm text-text-secondary"
          >
            Hoje
          </button>
          <button
            onClick={semanaProxima}
            className="p-2 rounded-xl border border-border-subtle hover:bg-elevated-solid/50 text-text-secondary"
            aria-label="Próxima semana"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm font-bold capitalize">
          <CalendarDays size={16} className="text-text-muted" />
          {labelSemana}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Pendente</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" />Confirmado</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />Realizado</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500" />Cancelado</span>
        </div>
      </div>

      {/* Grade */}
      <div className="rounded-2xl border border-border-subtle bg-elevated/40 overflow-x-auto">
        <div className="min-w-[920px]">
          {/* Cabeçalho dos dias */}
          <div
            className="grid border-b border-border-subtle bg-page/40 sticky top-0 z-10"
            style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}
          >
            <div />
            {dias.map((d) => {
              const diaStr = formatInTimeZone(d, TZ, 'yyyy-MM-dd');
              const hoje = diaStr === hojeStr;
              return (
                <div
                  key={diaStr}
                  className={`px-2 py-2 text-center border-l border-border-subtle ${hoje ? 'bg-purple-500/10' : ''}`}
                >
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">
                    {formatInTimeZone(d, TZ, 'EEE', { locale: ptBR })}
                  </div>
                  <div className={`text-base font-bold ${hoje ? 'text-purple-300' : 'text-text-primary'}`}>
                    {formatInTimeZone(d, TZ, 'dd/MM', { locale: ptBR })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Linhas de horários */}
          {HORARIOS_GRADE.map((horario) => (
            <div
              key={horario}
              className="grid border-b border-border-subtle/40 last:border-b-0"
              style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}
            >
              <div className="px-2 py-1 text-[11px] text-text-muted text-right border-r border-border-subtle/60">
                {horario.endsWith(':00') ? horario : ''}
              </div>
              {dias.map((d) => {
                const diaSemana = d.getDay();
                const diaStr = formatInTimeZone(d, TZ, 'yyyy-MM-dd');
                const fora = diaForaDaJanela(diaSemana, horario);
                const ags = indice.get(`${diaStr}|${horario}`) || [];

                return (
                  <div
                    key={diaStr + horario}
                    className={`relative h-10 border-l border-border-subtle/40 flex flex-col gap-px p-0.5 overflow-hidden ${
                      fora ? 'bg-page/40' : 'bg-elevated/20'
                    }`}
                  >
                    {ags.map((a) => {
                      const cor = STATUS_CORES[a.status] || STATUS_CORES.PENDENTE;
                      const lead = a.lead;
                      return (
                        <button
                          key={a.id}
                          onClick={() => abrirModal(a)}
                          className={`flex-1 min-h-0 px-1.5 rounded-md border text-[11px] text-left transition-colors flex items-center gap-1 ${cor.bloco} ${cor.texto}`}
                          title={`${STATUS_LABEL[a.status] ?? a.status}${lead ? ' · ' + lead.nome : ''} · ${formatInTimeZone(new Date(a.dataHora), TZ, 'HH:mm')}`}
                        >
                          <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${cor.ponto}`} />
                          <span className="truncate">
                            {lead?.nome ? lead.nome.split(' ')[0] : formatInTimeZone(new Date(a.dataHora), TZ, 'HH:mm')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de detalhes */}
      {selecionadoAtual && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={fecharModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border-subtle bg-page shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-4 border-b border-border-subtle">
              <div>
                <div className="text-sm text-text-muted capitalize">
                  {formatInTimeZone(new Date(selecionadoAtual.dataHora), TZ, "EEEE, dd 'de' MMM", { locale: ptBR })}
                </div>
                <div className="text-2xl font-extrabold flex items-center gap-2">
                  <Clock size={18} className="text-text-muted" />
                  {formatInTimeZone(new Date(selecionadoAtual.dataHora), TZ, 'HH:mm')}
                  <span className="text-xs font-normal text-text-faint">· {selecionadoAtual.duracaoMinutos}min</span>
                </div>
              </div>
              <button
                onClick={fecharModal}
                className="p-1.5 rounded-lg hover:bg-elevated/60 text-text-muted"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold ${
                  selecionadoAtual.status === 'PENDENTE'   ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                  selecionadoAtual.status === 'CONFIRMADO' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                  selecionadoAtual.status === 'REALIZADO'  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                  selecionadoAtual.status === 'CANCELADO'  ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' :
                  'bg-red-500/20 text-red-300 border-red-500/30'
                }`}>
                  {STATUS_LABEL[selecionadoAtual.status] ?? selecionadoAtual.status}
                </span>
              </div>

              {selecionadoAtual.lead && (
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <UserIcon size={14} className="text-text-muted" />
                    <strong>{selecionadoAtual.lead.nome}</strong>
                  </div>
                  {selecionadoAtual.lead.empresa && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Building2 size={14} className="text-text-muted" />
                      {selecionadoAtual.lead.empresa}
                    </div>
                  )}
                  {selecionadoAtual.lead.whatsapp && (
                    <a
                      href={whatsappLink(selecionadoAtual.lead.whatsapp)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
                    >
                      <MessageCircle size={14} />
                      {selecionadoAtual.lead.whatsapp}
                    </a>
                  )}
                  {selecionadoAtual.lead.email && (
                    <a
                      href={`mailto:${selecionadoAtual.lead.email}`}
                      className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
                    >
                      <Mail size={14} className="text-text-muted" />
                      {selecionadoAtual.lead.email}
                    </a>
                  )}
                </div>
              )}

              {/* Ações de status */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selecionadoAtual.status}
                  onChange={(e) => onAtualizar(selecionadoAtual.id, { status: e.target.value })}
                  disabled={salvandoId === selecionadoAtual.id}
                  className="px-3 py-1.5 rounded-xl bg-page/50 border border-border-subtle text-sm"
                >
                  {Object.entries(STATUS_LABEL).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>

                {selecionadoAtual.status === 'PENDENTE' && (
                  <button
                    onClick={() => onAtualizar(selecionadoAtual.id, { status: 'CONFIRMADO' })}
                    disabled={salvandoId === selecionadoAtual.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-sm"
                  >
                    <CheckCircle2 size={14} /> Confirmar
                  </button>
                )}
                {selecionadoAtual.status === 'CONFIRMADO' && (
                  <button
                    onClick={() => onAtualizar(selecionadoAtual.id, { status: 'REALIZADO' })}
                    disabled={salvandoId === selecionadoAtual.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-sm"
                  >
                    <CheckCircle2 size={14} /> Marcar realizado
                  </button>
                )}
                {(selecionadoAtual.status === 'PENDENTE' || selecionadoAtual.status === 'CONFIRMADO') && (
                  <button
                    onClick={() => onAtualizar(selecionadoAtual.id, { status: 'CANCELADO' })}
                    disabled={salvandoId === selecionadoAtual.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-500/30 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 text-sm"
                  >
                    <XCircle size={14} /> Cancelar
                  </button>
                )}
              </div>

              {selecionadoAtual.lead && selecionadoAtual.status !== 'CANCELADO' && (
                <Link
                  href={`/saas/venda?${new URLSearchParams({
                    leadId: selecionadoAtual.lead.id,
                    nomeEmpresa: selecionadoAtual.lead.empresa || '',
                    nomeDono: selecionadoAtual.lead.nome,
                    emailDono: selecionadoAtual.lead.email || '',
                  }).toString()}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-sm"
                >
                  <Briefcase size={14} /> Criar empresa cliente
                </Link>
              )}

              {/* Nota interna */}
              <div className="space-y-2 pt-2 border-t border-border-subtle/60">
                {!editandoNota && selecionadoAtual.observacao && (
                  <p className="text-sm text-text-secondary bg-page/40 border border-border-subtle/50 rounded-xl px-3 py-2 italic">
                    {selecionadoAtual.observacao}
                  </p>
                )}

                {editandoNota ? (
                  <>
                    <textarea
                      value={obsTexto}
                      onChange={(e) => setObsTexto(e.target.value)}
                      rows={3}
                      placeholder="Anotação interna sobre esse agendamento…"
                      className="w-full px-3 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm placeholder:text-text-faint"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditandoNota(false)}
                        className="px-3 py-1.5 rounded-xl border border-border-subtle text-sm text-text-muted hover:text-text-primary"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          await onAtualizar(selecionadoAtual.id, { observacao: obsTexto });
                          setEditandoNota(false);
                        }}
                        disabled={salvandoId === selecionadoAtual.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold"
                      >
                        {salvandoId === selecionadoAtual.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Salvar
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setObsTexto(selecionadoAtual.observacao || '');
                      setEditandoNota(true);
                    }}
                    className="text-sm text-text-muted hover:text-text-primary underline-offset-2 hover:underline"
                  >
                    {selecionadoAtual.observacao ? 'Editar nota' : 'Adicionar nota'}
                  </button>
                )}
              </div>

              {selecionadoAtual.alteradoPor && selecionadoAtual.alteradoEm && (
                <p className="text-[11px] text-text-faint">
                  Última alteração por {selecionadoAtual.alteradoPor} em{' '}
                  {formatInTimeZone(new Date(selecionadoAtual.alteradoEm), TZ, "dd/MM 'às' HH:mm")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
