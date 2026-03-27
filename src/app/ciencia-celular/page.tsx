'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Smartphone, Building2, FileCheck, AlertTriangle } from 'lucide-react';

export default function CienciaCelularPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  // Impersonate pula onboarding
  if ((session?.user as any)?.impersonatedBy || (session?.user as any)?.cargo === 'SUPER_ADMIN') {
    if (typeof window !== 'undefined') window.location.href = '/funcionario';
    return null;
  }

  const [cpf, setCpf] = useState('');
  const [opcao, setOpcao] = useState<'PROPRIO' | 'EMPRESA' | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const formatarCpf = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const cpfLimpo = cpf.replace(/\D/g, '');
  const formValido = cpfLimpo.length === 11 && opcao !== null;

  const handleSubmit = async () => {
    if (!formValido) return;
    setMsg('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/ciencia-celular', {
        cpf: cpfLimpo,
        opcao,
      });

      setMsg('Documento gerado com sucesso! Redirecionando...');

      await update({ deveDarCienciaCelular: false });

      setTimeout(() => {
        router.push('/funcionario');
      }, 1500);
    } catch (error: any) {
      setMsg(error.response?.data?.erro || 'Erro ao salvar.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <div className="w-full max-w-lg bg-surface-solid p-6 md:p-8 rounded-2xl border border-purple-900/50 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-purple-900/20 rounded-full flex items-center justify-center mb-4 text-purple-400">
            <FileCheck size={32} />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary mb-2">
            Termo de Ciência
          </h1>
          <p className="text-text-muted text-sm">
            Informe seu CPF e selecione qual dispositivo você usará para registrar o ponto.
          </p>
        </div>

        {/* CPF */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">CPF</label>
          <input
            type="text"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(formatarCpf(e.target.value))}
            className="w-full bg-elevated-solid border border-border-input rounded-lg py-3 px-4 text-text-primary focus:ring-2 focus:ring-purple-500 outline-none text-lg tracking-wider"
            placeholder="000.000.000-00"
          />
        </div>

        {/* Opções */}
        <div className="mb-6 space-y-3">
          <label className="block text-sm font-medium text-text-secondary mb-2">Dispositivo para registro de ponto</label>

          <button
            type="button"
            onClick={() => setOpcao('PROPRIO')}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${
              opcao === 'PROPRIO'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-border-subtle bg-elevated hover:border-border-default'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              opcao === 'PROPRIO' ? 'bg-purple-500/20 text-purple-400' : 'bg-elevated-solid text-text-faint'
            }`}>
              <Smartphone size={24} />
            </div>
            <div>
              <p className="font-bold text-text-primary text-sm">Meu celular pessoal</p>
              <p className="text-xs text-text-muted mt-0.5">Utilizarei meu próprio dispositivo para bater ponto.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOpcao('EMPRESA')}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${
              opcao === 'EMPRESA'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-border-subtle bg-elevated hover:border-border-default'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              opcao === 'EMPRESA' ? 'bg-purple-500/20 text-purple-400' : 'bg-elevated-solid text-text-faint'
            }`}>
              <Building2 size={24} />
            </div>
            <div>
              <p className="font-bold text-text-primary text-sm">Celular da empresa</p>
              <p className="text-xs text-text-muted mt-0.5">Utilizarei um dispositivo fornecido pela empresa.</p>
            </div>
          </button>
        </div>

        {/* Aviso legal */}
        <div className="flex items-start gap-3 bg-amber-900/10 border border-amber-500/20 rounded-xl p-3 mb-6">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/80 leading-relaxed">
            Esta declaração é de livre e espontânea vontade. Nenhuma das opções é obrigatória por parte do empregador. Um documento PDF será gerado automaticamente como comprovante.
          </p>
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`text-center font-bold text-sm mb-4 ${msg.includes('sucesso') ? 'text-emerald-400' : 'text-red-400'}`}>
            {msg}
          </div>
        )}

        {/* Botão */}
        <button
          onClick={handleSubmit}
          disabled={!formValido || loading}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Gerando documento...' : 'Confirmar e Gerar Documento'}
        </button>
      </div>
    </div>
  );
}
