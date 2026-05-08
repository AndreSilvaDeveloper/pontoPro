'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { AlertTriangle, X } from 'lucide-react';

type ConfirmOptions = {
  titulo: string;
  mensagem?: string;
  labelConfirmar?: string;
  labelCancelar?: string;
  perigo?: boolean;
  // Se preenchido, exige que o usuário digite exatamente esse texto pra liberar o botão.
  exigirDigitar?: string;
};

type ConfirmState =
  | { aberto: false }
  | { aberto: true; opts: ConfirmOptions; resolver: (ok: boolean) => void };

let estadoAtual: ConfirmState = { aberto: false };
const listeners = new Set<() => void>();

function setEstado(next: ConfirmState) {
  estadoAtual = next;
  listeners.forEach(fn => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return estadoAtual;
}

/**
 * Abre um diálogo de confirmação e retorna uma Promise<boolean>.
 * Substitui o uso de `confirm()` / `prompt()` nativos.
 */
export function confirmar(opts: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    setEstado({ aberto: true, opts, resolver: resolve });
  });
}

export function ConfirmDialog() {
  // useSyncExternalStore funciona em SSR também — basta retornar o snapshot
  const estado = useSyncExternalStore(subscribe, getSnapshot, () => ({ aberto: false } as ConfirmState));
  const [textoDigitado, setTextoDigitado] = useState('');

  useEffect(() => {
    if (estado.aberto) setTextoDigitado('');
  }, [estado.aberto]);

  if (!estado.aberto) return null;

  const { opts, resolver } = estado;
  const exigirDigitar = opts.exigirDigitar?.trim();
  const podeConfirmar = !exigirDigitar || textoDigitado === exigirDigitar;
  const perigo = !!opts.perigo;

  const fechar = (ok: boolean) => {
    setEstado({ aberto: false });
    resolver(ok);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => fechar(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border-default bg-page shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 flex items-start gap-3">
          <div
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              perigo ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/10 text-amber-400'
            }`}
          >
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-text-primary">{opts.titulo}</h3>
            {opts.mensagem && (
              <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{opts.mensagem}</p>
            )}

            {exigirDigitar && (
              <div className="mt-3 space-y-1.5">
                <label className="text-[11px] text-text-muted">
                  Digite <span className="font-mono font-bold text-text-primary">{exigirDigitar}</span> pra confirmar:
                </label>
                <input
                  autoFocus
                  value={textoDigitado}
                  onChange={e => setTextoDigitado(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-elevated/60 border border-border-subtle text-sm font-mono"
                  placeholder={exigirDigitar}
                />
              </div>
            )}
          </div>
          <button
            onClick={() => fechar(false)}
            className="shrink-0 p-1.5 rounded-lg hover:bg-elevated/60 text-text-muted"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle">
          <button
            onClick={() => fechar(false)}
            className="px-4 py-2 rounded-xl border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:bg-elevated/60 transition-colors"
          >
            {opts.labelCancelar ?? 'Cancelar'}
          </button>
          <button
            onClick={() => fechar(true)}
            disabled={!podeConfirmar}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              perigo
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {opts.labelConfirmar ?? (perigo ? 'Excluir' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
}
