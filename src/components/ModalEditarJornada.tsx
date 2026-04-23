'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { X, Save, Clock, Copy, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ModalProps {
  usuario: any;
  aoFechar: () => void;
  aoSalvar: () => void;
}

const DIAS = [
  { chave: 'seg', label: 'Segunda' },
  { chave: 'ter', label: 'Terça' },
  { chave: 'qua', label: 'Quarta' },
  { chave: 'qui', label: 'Quinta' },
  { chave: 'sex', label: 'Sexta' },
  { chave: 'sab', label: 'Sábado' },
  { chave: 'dom', label: 'Domingo' },
] as const;

type DiaChave = (typeof DIAS)[number]['chave'];

function timeToMin(t: string) {
  if (!t) return null;
  const [h, m] = t.split(':').map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function validarBloco(e: string, s: string) {
  const me = timeToMin(e);
  const ms = timeToMin(s);
  if (me == null && ms == null) return null;
  if (me == null || ms == null) return 'Preencha entrada e saída';
  if (ms <= me) return 'Saída deve ser maior que entrada';
  return null;
}

function uniqSortedNumbers(arr: any[]) {
  const out = Array.from(new Set(arr.map((n) => Number(n)).filter((n) => Number.isFinite(n))));
  out.sort((a, b) => a - b);
  return out;
}

export default function ModalEditarJornada({ usuario, aoFechar, aoSalvar }: ModalProps) {
  const [loading, setLoading] = useState(false);

  const jornadaPadrao: any = {
    seg: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    ter: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    qua: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    qui: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    sex: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    sab: { e1: '08:00', s1: '12:00', e2: '', s2: '', ativo: false },
    dom: { e1: '', s1: '', e2: '', s2: '', ativo: false },
  };

  const [jornada, setJornada] = useState<any>(jornadaPadrao);

  useEffect(() => {
    if (usuario?.jornada) {
      const j = usuario.jornada;
      const merged: any = {};
      for (const dia of DIAS) {
        merged[dia.chave] = { ...jornadaPadrao[dia.chave], ...(j[dia.chave] || {}) };
      }
      setJornada(merged);
    }
  }, [usuario?.jornada]);

  const updateJornada = (dia: string, campo: string, valor: any) => {
    setJornada((prev: any) => {
      const diaAtual = prev?.[dia] || {};
      const novoDia = { ...diaAtual, [campo]: valor };

      if (dia === 'sab' && campo === 'ativo' && valor === true) {
        if (!novoDia.regra || novoDia.regra?.tipo !== 'SABADOS_DO_MES') {
          novoDia.regra = { tipo: 'SABADOS_DO_MES', quais: [] };
        } else {
          novoDia.regra = {
            tipo: 'SABADOS_DO_MES',
            quais: uniqSortedNumbers(Array.isArray(novoDia.regra?.quais) ? novoDia.regra.quais : []),
          };
        }
      }

      if (dia === 'sab' && campo === 'ativo' && valor === false) {
        if (novoDia.regra) {
          const copy = { ...novoDia };
          delete copy.regra;
          return { ...prev, [dia]: copy };
        }
      }

      return { ...prev, [dia]: novoDia };
    });
  };

  const toggleSabadoDoMes = (n: number) => {
    setJornada((prev: any) => {
      const sab = prev?.sab || {};
      const regra = sab?.regra && sab.regra.tipo === 'SABADOS_DO_MES' ? sab.regra : { tipo: 'SABADOS_DO_MES', quais: [] };
      const atuais = uniqSortedNumbers(Array.isArray(regra.quais) ? regra.quais : []);
      const has = atuais.includes(n);
      const novos = has ? atuais.filter((x: number) => x !== n) : uniqSortedNumbers([...atuais, n]);

      return {
        ...prev,
        sab: {
          ...sab,
          ativo: true,
          regra: { tipo: 'SABADOS_DO_MES', quais: novos },
        },
      };
    });
  };

  const sabQuais: number[] = useMemo(() => {
    const regra = jornada?.sab?.regra;
    if (jornada?.sab?.ativo && regra?.tipo === 'SABADOS_DO_MES') {
      return uniqSortedNumbers(Array.isArray(regra?.quais) ? regra.quais : []);
    }
    return [];
  }, [jornada]);

  const errosJornada = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const dia of DIAS) {
      if (!jornada?.[dia.chave]?.ativo) continue;
      const { e1, s1, e2, s2 } = jornada[dia.chave];
      const arr: string[] = [];

      const me1 = timeToMin(e1);
      const ms2 = timeToMin(s2);
      const ms1 = timeToMin(s1);
      const me2 = timeToMin(e2);

      // Entrada e saída final são obrigatórias
      if (me1 == null && ms2 == null) {
        arr.push('Preencha ao menos entrada e saída');
      } else if (me1 == null) {
        arr.push('Preencha o horário de entrada');
      } else if (ms2 == null) {
        arr.push('Preencha o horário de saída');
      } else if (ms2 <= me1) {
        arr.push('Saída deve ser maior que entrada');
      }

      // Almoço: só valida se pelo menos um campo for preenchido
      const temAlmoco = ms1 != null || me2 != null;
      if (temAlmoco) {
        if (ms1 == null) arr.push('Preencha o horário de ida ao almoço');
        if (me2 == null) arr.push('Preencha o horário de volta do almoço');
        if (ms1 != null && me2 != null && me2 <= ms1) arr.push('Volta do almoço deve ser após ida');
        if (ms1 != null && me1 != null && ms1 <= me1) arr.push('Almoço deve ser após entrada');
        if (me2 != null && ms2 != null && ms2 <= me2) arr.push('Saída deve ser após volta do almoço');
      }

      if (arr.length) out[dia.chave] = arr;
    }
    return out;
  }, [jornada]);

  const replicarHorarioSegunda = () => {
    const base = jornada['seg'];
    if (!base) return;
    const novaJornada = { ...jornada };
    ['ter', 'qua', 'qui', 'sex'].forEach((dia) => {
      novaJornada[dia] = { ...base };
    });
    setJornada(novaJornada);
    toast.success('Horário de Segunda replicado até Sexta!');
  };

  const aplicarPreset = (tipo: 'COM_SABADO' | 'SEM_SABADO' | 'DOZE_X_TRINTA_E_SEIS') => {
    if (tipo === 'SEM_SABADO') {
      const padrao = { e1: '08:00', s1: '12:00', e2: '13:15', s2: '18:00', ativo: true };
      setJornada((prev: any) => ({
        ...prev,
        seg: padrao, ter: padrao, qua: padrao, qui: padrao, sex: padrao,
        sab: { ...prev.sab, ativo: false, e1: '', s1: '', e2: '', s2: '' },
        dom: { ...prev.dom, ativo: false, e1: '', s1: '', e2: '', s2: '' },
      }));
      toast.success('Preset aplicado: Seg-Sex, 1h15 almoço');
      return;
    }

    if (tipo === 'COM_SABADO') {
      const padrao = { e1: '08:00', s1: '12:00', e2: '14:00', s2: '18:00', ativo: true };
      const sabado = { e1: '08:00', s1: '12:00', e2: '', s2: '', ativo: true };
      setJornada((prev: any) => ({
        ...prev,
        seg: padrao, ter: padrao, qua: padrao, qui: padrao, sex: padrao,
        sab: sabado,
        dom: { ...prev.dom, ativo: false, e1: '', s1: '', e2: '', s2: '' },
      }));
      toast.success('Preset aplicado: Seg-Sáb, 2h almoço');
      return;
    }

    if (tipo === 'DOZE_X_TRINTA_E_SEIS') {
      const diaTrabalho = { e1: '07:00', s1: '', e2: '', s2: '19:00', ativo: true };
      const diaFolga = { e1: '', s1: '', e2: '', s2: '', ativo: false };
      setJornada((prev: any) => ({
        ...prev,
        seg: diaTrabalho, ter: diaFolga, qua: diaTrabalho, qui: diaFolga,
        sex: diaTrabalho, sab: diaFolga, dom: diaTrabalho,
      }));
      toast.success('Preset aplicado: 12x36');
    }
  };

  const salvar = async () => {
    const temErroJornada = Object.keys(errosJornada).length > 0;
    if (temErroJornada) {
      toast.warning('Existem horários inválidos. Corrija antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      await axios.put('/api/admin/usuario/jornada', {
        usuarioId: usuario.id,
        jornada,
      });
      toast.success('Escala atualizada com sucesso!');
      aoSalvar();
      aoFechar();
    } catch {
      toast.error('Erro ao salvar escala.');
    } finally {
      setLoading(false);
    }
  };

  const diaLabel: Record<string, string> = {
    seg: 'Segunda', ter: 'Terça', qua: 'Quarta',
    qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo',
  };

  return (
    <div className="fixed inset-0 lg:left-64 z-[60] md:flex md:items-center md:justify-center bg-page md:bg-overlay md:backdrop-blur-sm p-0 md:p-4 overflow-y-auto">
      <div className="bg-page md:bg-surface-solid w-full min-h-full md:min-h-0 md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-2xl md:border md:border-border-default shadow-2xl flex flex-col relative">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border-subtle flex justify-between items-center bg-surface-solid/80 backdrop-blur-sm md:rounded-t-2xl sticky top-0 z-10 flex-shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}>
          <h2 className="text-lg md:text-xl font-bold text-text-primary flex items-center gap-3">
            <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
              <Clock size={18} className="text-purple-400" />
            </div>
            Configurar Escala
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted hidden sm:block">{usuario?.nome}</span>
            <button
              onClick={aoFechar}
              className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong rounded-xl text-text-muted hover:text-text-primary transition-colors border border-border-subtle active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
          {/* Presets */}
          <div className="space-y-3">
            <div className="flex justify-between items-end border-b border-border-subtle pb-2">
              <h3 className="text-sm font-bold text-text-faint uppercase tracking-wider flex items-center gap-2">
                <Copy size={16} /> Modelos Rápidos
              </h3>
              <button
                type="button"
                onClick={replicarHorarioSegunda}
                className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors active:scale-95"
              >
                <Copy size={12} /> Copiar Seg &rarr; Sexta
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => aplicarPreset('SEM_SABADO')}
                className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300 text-xs font-bold hover:bg-blue-500/20 transition-colors active:scale-95"
              >
                Sem Sábado (1h15)
              </button>
              <button
                type="button"
                onClick={() => aplicarPreset('COM_SABADO')}
                className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300 text-xs font-bold hover:bg-purple-500/20 transition-colors active:scale-95"
              >
                Com Sábado (2h)
              </button>
              <button
                type="button"
                onClick={() => aplicarPreset('DOZE_X_TRINTA_E_SEIS')}
                className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 transition-colors active:scale-95"
              >
                12x36 (07h-19h)
              </button>
            </div>
          </div>

          {/* Validação */}
          {Object.keys(errosJornada).length > 0 && (
            <div className="flex items-start gap-2 bg-amber-900/10 border border-amber-500/20 rounded-xl p-3">
              <AlertTriangle className="text-amber-400 mt-0.5" size={16} />
              <div className="text-xs text-amber-100">
                Existem horários inválidos em alguns dias. Corrija para evitar inconsistências no ponto.
              </div>
            </div>
          )}

          {/* Dias */}
          <div className="space-y-3">
            {DIAS.map((dia) => {
              const diaErros = errosJornada[dia.chave] || [];
              return (
                <div
                  key={dia.chave}
                  className={`relative rounded-2xl border transition-all overflow-hidden ${
                    jornada[dia.chave]?.ativo
                      ? 'bg-surface border-border-default'
                      : 'bg-input-solid/30 border-border-subtle opacity-60'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between p-3.5 ${
                      jornada[dia.chave]?.ativo ? 'bg-white/[0.02]' : 'bg-transparent'
                    }`}
                  >
                    <span className="font-bold text-sm text-text-secondary flex items-center gap-2">
                      {diaLabel[dia.chave]}
                      {jornada[dia.chave]?.ativo && <CheckCircle2 size={12} className="text-emerald-500" />}
                    </span>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={jornada[dia.chave]?.ativo}
                        onChange={(e) => updateJornada(dia.chave, 'ativo', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-border-input peer-focus:outline-none rounded-full peer peer-checked:bg-purple-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm"></div>
                    </label>
                  </div>

                  {jornada[dia.chave]?.ativo && (
                    <div className="p-3.5 pt-0 space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <p className="text-[10px] text-text-faint font-bold uppercase text-center mb-1">Entrada</p>
                          <input
                            type="time"
                            value={jornada[dia.chave].e1}
                            onChange={(e) => updateJornada(dia.chave, 'e1', e.target.value)}
                            className="w-full bg-page border border-border-input rounded-xl p-2 text-text-primary text-xs font-mono text-center outline-none focus:border-purple-500 transition-colors"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-text-faint font-bold uppercase text-center mb-1">Almoço</p>
                          <input
                            type="time"
                            value={jornada[dia.chave].s1}
                            onChange={(e) => updateJornada(dia.chave, 's1', e.target.value)}
                            className="w-full bg-page border border-border-input rounded-xl p-2 text-text-primary text-xs font-mono text-center outline-none focus:border-purple-500 transition-colors"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-text-faint font-bold uppercase text-center mb-1">Volta</p>
                          <input
                            type="time"
                            value={jornada[dia.chave].e2}
                            onChange={(e) => updateJornada(dia.chave, 'e2', e.target.value)}
                            className="w-full bg-page border border-border-input rounded-xl p-2 text-text-primary text-xs font-mono text-center outline-none focus:border-purple-500 transition-colors"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-text-faint font-bold uppercase text-center mb-1">Saída</p>
                          <input
                            type="time"
                            value={jornada[dia.chave].s2}
                            onChange={(e) => updateJornada(dia.chave, 's2', e.target.value)}
                            className="w-full bg-page border border-border-input rounded-xl p-2 text-text-primary text-xs font-mono text-center outline-none focus:border-purple-500 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Regra do sábado (sábados do mês) */}
                      {dia.chave === 'sab' && (
                        <div className="mt-2 bg-page border border-border-input rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-text-faint font-bold uppercase">
                              Sábados do mês que trabalha
                            </p>
                            <span className="text-[10px] text-text-faint">
                              (marque 1-5)
                            </span>
                          </div>

                          <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map((n) => {
                              const active = sabQuais.includes(n);
                              return (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => toggleSabadoDoMes(n)}
                                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                                    active
                                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30'
                                      : 'bg-hover-bg border-border-default text-text-secondary hover:border-white/20'
                                  }`}
                                  title={`${n}º sábado do mês`}
                                >
                                  {n}º
                                </button>
                              );
                            })}
                          </div>

                          <div className="text-[10px] text-text-muted leading-relaxed">
                            Se não marcar nenhum, o sistema considera folga e <b>não cobra meta</b> no sábado.
                          </div>
                        </div>
                      )}

                      {diaErros.length > 0 && (
                        <div className="text-[10px] text-amber-200 bg-amber-900/10 border border-amber-500/20 rounded-xl p-2">
                          {diaErros.map((m, i) => (
                            <div key={i}>• {m}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-border-subtle bg-surface-solid/80 backdrop-blur-sm md:rounded-b-2xl sticky bottom-0 z-10 flex-shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          <button
            onClick={salvar}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-text-primary shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base active:scale-95 bg-blue-600 hover:bg-blue-500 shadow-blue-900/30"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <>
                <Save size={20} /> Salvar Escala
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
