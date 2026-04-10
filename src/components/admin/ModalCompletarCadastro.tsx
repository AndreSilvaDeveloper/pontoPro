'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Building2, Phone, Save, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { validarCNPJ } from '@/utils/cnpj';

interface Props {
  empresa: any;
  onComplete: () => void;
}

type Etapa = 'dados' | 'codigo';

export default function ModalCompletarCadastro({ empresa, onComplete }: Props) {
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>('dados');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [codigo, setCodigo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [canalEnvio, setCanalEnvio] = useState<'sms' | 'whatsapp'>('sms');
  const [reenvioTimer, setReenvioTimer] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
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

  // Timer de reenvio
  useEffect(() => {
    if (reenvioTimer <= 0) return;
    const t = setTimeout(() => setReenvioTimer(reenvioTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [reenvioTimer]);

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

  const enviarCodigo = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const telLimpo = telefone.replace(/\D/g, '');

    if (!validarCNPJ(cnpjLimpo)) {
      toast.error('CNPJ inválido. Verifique os dígitos.');
      return;
    }

    if (telLimpo.length < 10) {
      toast.error('Informe um telefone válido');
      return;
    }

    setEnviandoCodigo(true);
    try {
      const res = await axios.post('/api/auth/verificar-telefone', { telefone: telLimpo });
      if (res.data.ok) {
        setCanalEnvio(res.data.canal || 'sms');
        toast.success(res.data.canal === 'whatsapp' ? 'Código enviado pelo WhatsApp!' : 'Código enviado por SMS!');
        setEtapa('codigo');
        setCodigo('');
        setReenvioTimer(120); // 2 minutos
        setTimeout(() => inputsRef.current[0]?.focus(), 100);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar SMS');
    } finally {
      setEnviandoCodigo(false);
    }
  };

  const validarCodigo = async () => {
    const telLimpo = telefone.replace(/\D/g, '');
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    if (codigo.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    setSalvando(true);
    try {
      // Validar código
      const resValidar = await axios.put('/api/auth/verificar-telefone', {
        telefone: telLimpo,
        codigo,
      });

      if (!resValidar.data.ok) {
        toast.error('Código inválido');
        setSalvando(false);
        return;
      }

      // Código válido — salvar dados
      await axios.put('/api/admin/empresa', {
        cnpj: cnpjLimpo,
        cobrancaWhatsapp: telLimpo,
      });

      toast.success('Telefone verificado e dados salvos!');
      sessionStorage.setItem('cadastro-completado', '1');
      setAberto(false);
      (window as any).__cadastroCompleto = true;
      window.dispatchEvent(new Event('cadastro-completo'));
      onComplete();
    } catch (err: any) {
      toast.error(err.response?.data?.erro || 'Erro ao validar');
    } finally {
      setSalvando(false);
    }
  };

  // Input de código: auto-avança ao digitar
  const handleCodigoChange = (val: string, index: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newCodigo = codigo.split('');
    newCodigo[index] = digit;
    setCodigo(newCodigo.join(''));

    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleCodigoKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  // Colar código completo
  const handleCodigoPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setCodigo(pasted);
    if (pasted.length === 6) {
      inputsRef.current[5]?.focus();
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface-solid border border-border-default w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-5">

          {etapa === 'dados' ? (
            <>
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
                  <label className="text-[10px] text-text-muted font-bold uppercase ml-1">Celular / WhatsApp</label>
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
                  <p className="text-[10px] text-text-dim ml-1">Enviaremos um código SMS para verificar</p>
                </div>
              </div>

              <button
                onClick={enviarCodigo}
                disabled={enviandoCodigo}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-elevated-solid disabled:text-text-faint text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {enviandoCodigo ? (
                  <><RefreshCw size={16} className="animate-spin" /> Enviando código...</>
                ) : (
                  <><Phone size={16} /> Enviar código SMS</>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                  <ShieldCheck size={28} className="text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">Verifique seu telefone</h2>
                <p className="text-sm text-text-muted">
                  Código de 6 dígitos enviado por {canalEnvio === 'whatsapp' ? 'WhatsApp' : 'SMS'} para{' '}
                  <strong className="text-text-primary">{telefone}</strong>
                </p>
              </div>

              {/* Input de 6 dígitos */}
              <div className="flex justify-center gap-2" onPaste={handleCodigoPaste}>
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <input
                    key={i}
                    ref={el => { inputsRef.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={codigo[i] || ''}
                    onChange={e => handleCodigoChange(e.target.value, i)}
                    onKeyDown={e => handleCodigoKeyDown(e, i)}
                    className="w-11 h-13 text-center text-xl font-bold bg-page border border-border-input rounded-xl text-text-primary outline-none focus:border-purple-500 transition-colors"
                  />
                ))}
              </div>

              <button
                onClick={validarCodigo}
                disabled={salvando || codigo.length < 6}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-elevated-solid disabled:text-text-faint text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {salvando ? 'Verificando...' : <><ShieldCheck size={16} /> Verificar e salvar</>}
              </button>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setEtapa('dados'); setCodigo(''); }}
                  className="text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  Trocar número
                </button>
                <button
                  onClick={enviarCodigo}
                  disabled={reenvioTimer > 0 || enviandoCodigo}
                  className="text-xs text-purple-400 hover:text-purple-300 disabled:text-text-dim transition-colors"
                >
                  {reenvioTimer > 0
                    ? `Reenviar em ${Math.floor(reenvioTimer / 60)}:${String(reenvioTimer % 60).padStart(2, '0')}`
                    : 'Reenviar código'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
