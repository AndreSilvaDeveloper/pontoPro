'use client';

import { useEffect, useState } from 'react';
import { FileCheck, Users, Pencil, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import Link from 'next/link';

const STORAGE_KEY = 'ui:ciencia-celular-alert-dismissed';

function firePromptsReady() {
  (window as any).__promptsReady = true;
  window.dispatchEvent(new Event('prompts-ready'));
}

export default function CienciaCelularAlertModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [billingDone, setBillingDone] = useState(false);

  // Espera o billing terminar antes de avaliar
  useEffect(() => {
    const w = window as any;
    if (w.__billingDone) { setBillingDone(true); return; }
    const handler = () => setBillingDone(true);
    window.addEventListener('billing-modal-closed', handler);
    return () => window.removeEventListener('billing-modal-closed', handler);
  }, []);

  useEffect(() => {
    if (!billingDone) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        firePromptsReady();
        return;
      }
    } catch {}
    setOpen(true);
  }, [billingDone]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
    firePromptsReady();
  };

  const aplicarParaTodos = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/admin/funcionarios/ciencia-celular-massa');
      const { atualizados } = res.data;
      if (atualizados > 0) {
        toast.success(`Termo de ciência exigido para ${atualizados} funcionário(s)!`);
      } else {
        toast.info('Nenhum funcionário pendente encontrado.');
      }
      dismiss();
    } catch {
      toast.error('Erro ao aplicar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-2xl border bg-purple-950/60 border-purple-500/30 p-5 shadow-2xl">
        <button
          className="absolute right-3 top-3 text-text-primary/60 hover:text-text-primary"
          onClick={dismiss}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-purple-500/20 p-2.5">
            <FileCheck size={22} className="text-purple-400" />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-text-primary">Nova funcionalidade</h3>
            <p className="mt-1 text-sm text-text-primary/80">
              Agora você pode exigir que seus funcionários assinem um <strong>Termo de Ciência</strong> sobre o uso de celular pessoal para bater ponto.
            </p>

            <div className="mt-3 text-xs text-text-primary/70 space-y-1.5">
              <p>O funcionário informa o CPF e declara se usará celular próprio ou da empresa. Um PDF é gerado automaticamente.</p>
              <p>Você pode ativar isso individualmente no cadastro de cada funcionário, ou aplicar para todos de uma vez.</p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={aplicarParaTodos}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
              >
                <Users size={16} />
                {loading ? 'Aplicando...' : 'Exigir de todos os funcionários'}
              </button>

              <Link
                href="/admin/funcionarios"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-hover-bg-strong hover:bg-white/15 px-4 py-2.5 text-sm font-bold text-text-primary transition-colors"
                onClick={dismiss}
              >
                <Pencil size={16} />
                Escolher individualmente
              </Link>

              <button
                className="w-full rounded-xl bg-transparent hover:bg-white/5 px-4 py-2 text-xs text-text-muted transition-colors"
                onClick={dismiss}
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
