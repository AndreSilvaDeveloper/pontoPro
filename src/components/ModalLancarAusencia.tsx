// src/components/ModalLancarAusencia.tsx
'use client';

import { Plane, X, PlusCircle } from 'lucide-react';

type Usuario = {
  id: string;
  nome: string;
  email?: string;
};

type Props = {
  aberto: boolean;
  onClose: () => void;
  usuarios: Usuario[];

  // form state
  ausenciaUser: string;
  setAusenciaUser: (v: string) => void;

  ausenciaTipo: string;
  setAusenciaTipo: (v: string) => void;

  ausenciaInicio: string;
  setAusenciaInicio: (v: string) => void;

  ausenciaFim: string;
  setAusenciaFim: (v: string) => void;

  ausenciaMotivo: string;
  setAusenciaMotivo: (v: string) => void;

  // ✅ NOVO (opcional por enquanto, pra não quebrar o pai)
  ausenciaHoraInicio?: string;
  setAusenciaHoraInicio?: (v: string) => void;

  ausenciaHoraFim?: string;
  setAusenciaHoraFim?: (v: string) => void;

  salvando: boolean;
  onConfirmar: () => void;
};

function timeToMinutes(t?: string) {
  if (!t) return null;
  const [h, m] = t.split(':').map((x) => Number(x));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export default function ModalLancarAusencia({
  aberto,
  onClose,
  usuarios,

  ausenciaUser,
  setAusenciaUser,

  ausenciaTipo,
  setAusenciaTipo,

  ausenciaInicio,
  setAusenciaInicio,

  ausenciaFim,
  setAusenciaFim,

  ausenciaMotivo,
  setAusenciaMotivo,

  // novo (opcional)
  ausenciaHoraInicio,
  setAusenciaHoraInicio,

  ausenciaHoraFim,
  setAusenciaHoraFim,

  salvando,
  onConfirmar,
}: Props) {
  if (!aberto) return null;

  const suportaParcial = ausenciaTipo === 'FOLGA' || ausenciaTipo === 'ATESTADO';
  const hasTimeSupport = Boolean(setAusenciaHoraInicio && setAusenciaHoraFim);

  const iniMin = timeToMinutes(ausenciaHoraInicio);
  const fimMin = timeToMinutes(ausenciaHoraFim);

  const folgaHorarioInvalido =
    suportaParcial &&
    hasTimeSupport &&
    (
      !ausenciaHoraInicio ||
      !ausenciaHoraFim ||
      iniMin === null ||
      fimMin === null ||
      fimMin <= iniMin
    );

  const bloquearConfirmar =
    salvando ||
    (suportaParcial && hasTimeSupport && folgaHorarioInvalido);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface-solid border border-border-default w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-border-subtle pb-4">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Plane size={20} className="text-blue-400" /> Lançar Ausência
          </h3>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <div>
          <label className="text-xs text-text-muted block mb-1 uppercase tracking-wider font-bold">
            Funcionário
          </label>
          <select
            value={ausenciaUser}
            onChange={(e) => setAusenciaUser(e.target.value)}
            className="w-full bg-page border border-border-input p-3 rounded-xl text-text-primary text-sm"
          >
            <option value="">Selecione...</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted block mb-1 uppercase tracking-wider font-bold">
              Tipo
            </label>
            <select
              value={ausenciaTipo}
              onChange={(e) => setAusenciaTipo(e.target.value)}
              className="w-full bg-page border border-border-input p-2.5 rounded-xl text-text-primary text-xs"
            >
              <option value="FOLGA">Folga / Abono</option>
              <option value="ATESTADO">Atestado Médico</option>
              <option value="FERIAS">Férias</option>
              <option value="SUSPENSAO">Suspensão</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-text-muted block mb-1 uppercase tracking-wider font-bold">
              Início
            </label>
            <input
              type="date"
              value={ausenciaInicio}
              onChange={(e) => setAusenciaInicio(e.target.value)}
              className="w-full bg-page border border-border-input p-2.5 rounded-xl text-text-primary text-xs text-center"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-text-muted block mb-1 uppercase tracking-wider font-bold">
            Fim (Opcional)
          </label>
          <input
            type="date"
            value={ausenciaFim}
            onChange={(e) => setAusenciaFim(e.target.value)}
            className="w-full bg-page border border-border-input p-2.5 rounded-xl text-text-primary text-sm text-center"
          />
        </div>

        {/* ✅ NOVO: Horário (somente para FOLGA) */}
        {suportaParcial && hasTimeSupport && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-text-muted uppercase tracking-wider font-bold">
                Horário da Folga
              </label>
              <span className="text-[10px] text-text-faint">
                (ex.: Quarta-feira de Cinzas)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-text-faint block mb-1 uppercase tracking-wider font-bold">
                  Hora início
                </label>
                <input
                  type="time"
                  value={ausenciaHoraInicio || ''}
                  onChange={(e) => setAusenciaHoraInicio?.(e.target.value)}
                  className="w-full bg-page border border-border-input p-2.5 rounded-xl text-text-primary text-sm text-center"
                />
              </div>

              <div>
                <label className="text-[10px] text-text-faint block mb-1 uppercase tracking-wider font-bold">
                  Hora fim
                </label>
                <input
                  type="time"
                  value={ausenciaHoraFim || ''}
                  onChange={(e) => setAusenciaHoraFim?.(e.target.value)}
                  className="w-full bg-page border border-border-input p-2.5 rounded-xl text-text-primary text-sm text-center"
                />
              </div>
            </div>

            {folgaHorarioInvalido && (
              <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2">
                Informe um intervalo válido: <b>hora fim</b> precisa ser maior que <b>hora início</b>.
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-xs text-text-muted block mb-1 uppercase tracking-wider font-bold">
            Observação
          </label>
          <textarea
            value={ausenciaMotivo}
            onChange={(e) => setAusenciaMotivo(e.target.value)}
            placeholder="Ex: Quarta-feira de Cinzas - folga parcial..."
            className="w-full bg-page border border-border-input p-3 rounded-xl text-text-primary text-sm h-20 resize-none"
          />
        </div>

        <button
          onClick={onConfirmar}
          disabled={bloquearConfirmar}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-elevated-solid disabled:text-text-faint text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 transition-all"
        >
          {salvando ? (
            'Lançando...'
          ) : (
            <>
              <PlusCircle size={18} /> Confirmar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
