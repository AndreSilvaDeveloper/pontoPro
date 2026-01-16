'use client';

import { useMemo, useState } from 'react';
import axios from 'axios';
import { X, Save, Clock, Copy } from 'lucide-react';

interface ModalProps {
  usuario: any;
  aoFechar: () => void;
  aoSalvar: () => void;
}

const DIAS = [
  { chave: 'seg', label: 'Segunda-feira' },
  { chave: 'ter', label: 'Terça-feira' },
  { chave: 'qua', label: 'Quarta-feira' },
  { chave: 'qui', label: 'Quinta-feira' },
  { chave: 'sex', label: 'Sexta-feira' },
  { chave: 'sab', label: 'Sábado' },
  { chave: 'dom', label: 'Domingo' },
] as const;

type DiaChave = (typeof DIAS)[number]['chave'];

type DiaJornada = {
  e1: string; // entrada
  s1: string; // saida (intervalo/almoço)
  e2: string; // volta (intervalo/almoço)
  s2: string; // saida final
  ativo: boolean;
};

type Jornada = Record<DiaChave, DiaJornada>;

const criarDia = (ativo: boolean, e1 = '', s1 = '', e2 = '', s2 = ''): DiaJornada => ({
  e1,
  s1,
  e2,
  s2,
  ativo,
});

export default function ModalEditarJornada({ usuario, aoFechar, aoSalvar }: ModalProps) {
  const [loading, setLoading] = useState(false);

  const jornadaInicial: Jornada = useMemo(() => {
    const padrao: Jornada = {
      seg: criarDia(true, '08:00', '12:00', '13:15', '18:00'),
      ter: criarDia(true, '08:00', '12:00', '13:15', '18:00'),
      qua: criarDia(true, '08:00', '12:00', '13:15', '18:00'),
      qui: criarDia(true, '08:00', '12:00', '13:15', '18:00'),
      sex: criarDia(true, '08:00', '12:00', '13:15', '18:00'),
      sab: criarDia(false),
      dom: criarDia(false),
    };

    // Se já tiver jornada salva no usuário, usa ela (faz merge simples para evitar undefined)
    if (usuario?.jornada) {
      const j = usuario.jornada as Partial<Jornada>;
      return {
        seg: { ...padrao.seg, ...(j.seg || {}) },
        ter: { ...padrao.ter, ...(j.ter || {}) },
        qua: { ...padrao.qua, ...(j.qua || {}) },
        qui: { ...padrao.qui, ...(j.qui || {}) },
        sex: { ...padrao.sex, ...(j.sex || {}) },
        sab: { ...padrao.sab, ...(j.sab || {}) },
        dom: { ...padrao.dom, ...(j.dom || {}) },
      };
    }

    return padrao;
  }, [usuario?.jornada]);

  const [jornada, setJornada] = useState<Jornada>(jornadaInicial);

  // Para o preset 12x36: qual dia é "base" (dia trabalhado)
  const [diaBase12x36, setDiaBase12x36] = useState<DiaChave>('seg');

  const handleChange = (dia: DiaChave, campo: keyof DiaJornada, valor: string) => {
    setJornada((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor },
    }));
  };

  const toggleDia = (dia: DiaChave) => {
    setJornada((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], ativo: !prev[dia].ativo },
    }));
  };

  // --- PRESETS ---
  const aplicarPreset = (tipo: 'COM_SABADO' | 'SEM_SABADO' | 'DOZE_X_TRINTA_E_SEIS') => {
    if (tipo === 'COM_SABADO') {
      const padrao2h = criarDia(true, '08:00', '12:00', '14:00', '18:00');
      const sabado = criarDia(true, '08:00', '12:00', '', '');
      setJornada((prev) => ({
        ...prev,
        seg: padrao2h,
        ter: padrao2h,
        qua: padrao2h,
        qui: padrao2h,
        sex: padrao2h,
        sab: sabado,
        dom: { ...prev.dom, ativo: false, e1: '', s1: '', e2: '', s2: '' },
      }));
      return;
    }

    if (tipo === 'SEM_SABADO') {
      const padrao1h15 = criarDia(true, '08:00', '12:00', '13:15', '18:00');
      setJornada((prev) => ({
        ...prev,
        seg: padrao1h15,
        ter: padrao1h15,
        qua: padrao1h15,
        qui: padrao1h15,
        sex: padrao1h15,
        sab: { ...prev.sab, ativo: false, e1: '', s1: '', e2: '', s2: '' },
        dom: { ...prev.dom, ativo: false, e1: '', s1: '', e2: '', s2: '' },
      }));
      return;
    }

    // 12x36: marca dias alternados como ativos, baseado em diaBase12x36
    if (tipo === 'DOZE_X_TRINTA_E_SEIS') {
      const idxBase = DIAS.findIndex((d) => d.chave === diaBase12x36);

      // Padrão comum 12h: 07:00-19:00
      // Intervalo opcional: deixei vazio por padrão para não "forçar almoço"
      const diaTrabalho = criarDia(true, '07:00', '', '', '19:00');
      const diaFolga = criarDia(false);

      const nova: Partial<Jornada> = {};
      DIAS.forEach((d, i) => {
        const diff = (i - idxBase + 7) % 7;
        const trabalha = diff % 2 === 0; // alterna
        nova[d.chave] = trabalha ? diaTrabalho : diaFolga;
      });

      setJornada((prev) => ({
        ...prev,
        ...(nova as Jornada),
      }));
    }
  };

  // --- COPIAR SEGUNDA PARA O RESTO DA SEMANA ---
  const copiarSegundaParaSemana = (opcao: 'MANTER_ATIVO' | 'COPIAR_TUDO' = 'MANTER_ATIVO') => {
    setJornada((prev) => {
      const seg = prev.seg;

      const aplicar = (dia: DiaChave) => {
        if (dia === 'seg') return prev[dia];
        if (opcao === 'COPIAR_TUDO') {
          return { ...seg };
        }
        // MANTER_ATIVO: copia horários, mas mantém o "ativo" do dia atual
        return { ...prev[dia], e1: seg.e1, s1: seg.s1, e2: seg.e2, s2: seg.s2 };
      };

      return {
        seg: prev.seg,
        ter: aplicar('ter'),
        qua: aplicar('qua'),
        qui: aplicar('qui'),
        sex: aplicar('sex'),
        sab: aplicar('sab'),
        dom: aplicar('dom'),
      };
    });
  };

  const salvar = async () => {
    setLoading(true);
    try {
      await axios.put('/api/admin/usuario/jornada', {
        usuarioId: usuario.id,
        jornada,
      });
      alert('Escala atualizada com sucesso!');
      aoSalvar();
      aoFechar();
    } catch (error) {
      alert('Erro ao salvar escala.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="text-purple-400" /> Configurar Escala
            </h3>
            <p className="text-slate-400 text-sm">
              Funcionário: <span className="text-white font-bold">{usuario.nome}</span>
            </p>
          </div>
          <button onClick={aoFechar} className="text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Modelos + Copiar */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400 font-bold uppercase flex items-center gap-2">
                <Copy size={12} /> Modelos Rápidos
              </p>

              <button
                onClick={() => copiarSegundaParaSemana('MANTER_ATIVO')}
                className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-700 text-slate-200 px-3 py-2 rounded text-xs font-bold transition-all flex items-center gap-2"
                title="Copia os horários da Segunda para os demais dias, mantendo o 'ativo' de cada dia"
              >
                <Copy size={14} /> Copiar Segunda → Semana
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => aplicarPreset('SEM_SABADO')}
                className="flex-1 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 text-blue-200 py-2 rounded text-xs font-bold transition-all"
              >
                Sem Sábado (1h15 Almoço)
              </button>

              <button
                onClick={() => aplicarPreset('COM_SABADO')}
                className="flex-1 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800 text-purple-200 py-2 rounded text-xs font-bold transition-all"
              >
                Com Sábado (2h Almoço)
              </button>
            </div>

            {/* 12x36 */}
            <div className="grid grid-cols-12 gap-3 items-center pt-2">
              <div className="col-span-12 sm:col-span-4">
                <p className="text-[11px] text-slate-400 font-bold uppercase">12x36</p>
                <p className="text-[11px] text-slate-500">Alterna dias ativos/inativos</p>
              </div>

              <div className="col-span-12 sm:col-span-5">
                <label className="text-[10px] text-slate-500 block mb-1">Dia base (trabalha)</label>
                <select
                  value={diaBase12x36}
                  onChange={(e) => setDiaBase12x36(e.target.value as DiaChave)}
                  className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-white text-xs"
                >
                  {DIAS.map((d) => (
                    <option key={d.chave} value={d.chave}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-12 sm:col-span-3">
                <button
                  onClick={() => aplicarPreset('DOZE_X_TRINTA_E_SEIS')}
                  className="w-full bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-800 text-emerald-200 py-2 rounded text-xs font-bold transition-all"
                >
                  Aplicar 12x36
                </button>
              </div>

              <div className="col-span-12">
                <p className="text-[11px] text-slate-500">
                  Padrão aplicado: <span className="text-slate-300 font-bold">07:00 → 19:00</span> (intervalo vazio; edite se quiser).
                </p>
              </div>
            </div>

            {/* Extra: copiar tudo (inclui ativo) */}
            <div className="flex justify-end">
              <button
                onClick={() => copiarSegundaParaSemana('COPIAR_TUDO')}
                className="text-[11px] text-slate-400 hover:text-white underline underline-offset-4"
                title="Copia inclusive o 'ativo' da Segunda para todos os dias (deixa todos iguais)"
              >
                Copiar Segunda (incluindo ativo)
              </button>
            </div>
          </div>

          {/* Lista de Dias */}
          <div className="space-y-2">
            {DIAS.map((dia) => (
              <div
                key={dia.chave}
                className={`grid grid-cols-12 gap-2 items-center p-3 rounded-lg border ${
                  jornada[dia.chave]?.ativo
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-slate-900/50 border-slate-800 opacity-60'
                }`}
              >
                <div className="col-span-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={jornada[dia.chave]?.ativo}
                    onChange={() => toggleDia(dia.chave)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600"
                  />
                  <span className="text-sm font-bold text-slate-300">{dia.label}</span>
                </div>

                {jornada[dia.chave]?.ativo ? (
                  <div className="col-span-9 grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Entrada</label>
                      <input
                        type="time"
                        value={jornada[dia.chave].e1}
                        onChange={(e) => handleChange(dia.chave, 'e1', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-600 rounded p-1 text-white text-xs text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Saída Almoço</label>
                      <input
                        type="time"
                        value={jornada[dia.chave].s1}
                        onChange={(e) => handleChange(dia.chave, 's1', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-600 rounded p-1 text-white text-xs text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Volta Almoço</label>
                      <input
                        type="time"
                        value={jornada[dia.chave].e2}
                        onChange={(e) => handleChange(dia.chave, 'e2', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-600 rounded p-1 text-white text-xs text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Saída</label>
                      <input
                        type="time"
                        value={jornada[dia.chave].s2}
                        onChange={(e) => handleChange(dia.chave, 's2', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-600 rounded p-1 text-white text-xs text-center"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="col-span-9 text-xs text-slate-600 italic text-center py-2">
                    Dia de folga / Livre
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={aoFechar}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={salvar}
            disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg shadow-green-900/20 transition-all"
          >
            {loading ? 'Salvando...' : (
              <>
                <Save size={18} /> Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
