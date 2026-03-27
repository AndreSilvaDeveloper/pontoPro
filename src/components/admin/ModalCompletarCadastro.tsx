'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Phone, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  empresa: any;
  onComplete: () => void;
}

export default function ModalCompletarCadastro({ empresa, onComplete }: Props) {
  const [aberto, setAberto] = useState(false);
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    // Se já completou nesta sessão, não mostra de novo
    if (sessionStorage.getItem('cadastro-completado')) {
      (window as any).__cadastroCompleto = true;
      window.dispatchEvent(new Event('cadastro-completo'));
      return;
    }
    if (empresa && !empresa.cnpj) {
      setAberto(true);
    } else if (empresa && empresa.cnpj) {
      sessionStorage.setItem('cadastro-completado', '1');
      (window as any).__cadastroCompleto = true;
      window.dispatchEvent(new Event('cadastro-completo'));
    }
  }, [empresa]);

  const formatarCnpj = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  };

  const formatarTelefone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const salvar = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const telLimpo = telefone.replace(/\D/g, '');

    if (cnpjLimpo.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }

    if (telLimpo.length < 10) {
      toast.error('Informe um telefone válido');
      return;
    }

    setSalvando(true);
    try {
      await axios.put('/api/admin/empresa', {
        cnpj: cnpjLimpo,
        cobrancaWhatsapp: telLimpo,
      });
      toast.success('Dados salvos!');
      sessionStorage.setItem('cadastro-completado', '1');
      setAberto(false);
      (window as any).__cadastroCompleto = true;
      window.dispatchEvent(new Event('cadastro-completo'));
      onComplete();
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface-solid border border-border-default w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <Building2 size={28} className="text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">Complete seu cadastro</h2>
            <p className="text-sm text-text-muted">Precisamos dessas informações para gerar cobranças e enviar notificações.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-text-muted font-bold uppercase ml-1">CNPJ da empresa</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-3.5 text-text-faint" />
                <input
                  type="text"
                  value={cnpj}
                  onChange={e => setCnpj(formatarCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="w-full bg-page border border-border-input p-3 pl-9 rounded-xl text-text-primary text-sm outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-text-muted font-bold uppercase ml-1">WhatsApp para contato</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-3.5 text-text-faint" />
                <input
                  type="tel"
                  value={telefone}
                  onChange={e => setTelefone(formatarTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-page border border-border-input p-3 pl-9 rounded-xl text-text-primary text-sm outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-elevated-solid disabled:text-text-faint text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            {salvando ? 'Salvando...' : <><Save size={16} /> Salvar e continuar</>}
          </button>

        </div>
      </div>
    </div>
  );
}
