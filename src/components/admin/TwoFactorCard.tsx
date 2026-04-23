'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { toast } from 'sonner';
import { ShieldCheck, Shield, Copy, CheckCircle2, Loader2, X } from 'lucide-react';
import QRCode from 'qrcode';

type Status = 'loading' | 'off' | 'setup' | 'on';

export default function TwoFactorCard() {
  const [status, setStatus] = useState<Status>('loading');
  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [codigo, setCodigo] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [showBackup, setShowBackup] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const carregar = async () => {
    try {
      const res = await axios.get('/api/admin/2fa');
      setStatus(res.data.enabled ? 'on' : 'off');
    } catch {
      setStatus('off');
    }
  };

  useEffect(() => { carregar(); }, []);

  const iniciarSetup = async () => {
    setLoadingAction(true);
    try {
      const res = await axios.post('/api/admin/2fa');
      setSecret(res.data.secret);
      const qr = await QRCode.toDataURL(res.data.uri, { width: 240, margin: 1 });
      setQrDataUrl(qr);
      setStatus('setup');
    } catch (e: any) {
      toast.error(e?.response?.data?.erro || 'Erro ao iniciar 2FA');
    } finally {
      setLoadingAction(false);
    }
  };

  const confirmar = async () => {
    if (!codigo || codigo.length < 6) {
      toast.warning('Digite o código de 6 dígitos');
      return;
    }
    setLoadingAction(true);
    try {
      const res = await axios.put('/api/admin/2fa', { codigo });
      setBackupCodes(res.data.backupCodes);
      setShowBackup(true);
      setStatus('on');
      setCodigo('');
      toast.success('2FA ativado com sucesso!');
    } catch (e: any) {
      toast.error(e?.response?.data?.erro || 'Código inválido');
    } finally {
      setLoadingAction(false);
    }
  };

  const desativar = async () => {
    if (!codigo || codigo.length < 6) {
      toast.warning('Digite o código atual para confirmar');
      return;
    }
    if (!confirm('Tem certeza que deseja desativar o 2FA?')) return;
    setLoadingAction(true);
    try {
      await axios.delete('/api/admin/2fa', { data: { codigo } });
      setStatus('off');
      setCodigo('');
      toast.success('2FA desativado');
    } catch (e: any) {
      toast.error(e?.response?.data?.erro || 'Erro ao desativar');
    } finally {
      setLoadingAction(false);
    }
  };

  const copiarTudo = () => {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Códigos copiados');
  };

  return (
    <div className="bg-surface backdrop-blur-sm border border-border-subtle rounded-2xl p-5 md:p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-xl ${status === 'on' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-purple-500/15 text-purple-400'}`}>
          {status === 'on' ? <ShieldCheck size={22} /> : <Shield size={22} />}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-text-primary">Autenticação em Dois Fatores (2FA)</h2>
          <p className="text-sm text-text-muted mt-0.5">
            Adiciona uma camada extra de segurança no seu login usando um app autenticador (Google Authenticator, 1Password, Authy).
          </p>
        </div>
        <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          status === 'on'
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            : 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
        }`}>
          {status === 'on' ? 'Ativo' : status === 'setup' ? 'Configurando' : 'Inativo'}
        </span>
      </div>

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 size={14} className="animate-spin" /> Carregando...
        </div>
      )}

      {status === 'off' && (
        <button
          onClick={iniciarSetup}
          disabled={loadingAction}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors"
        >
          {loadingAction ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
          Ativar 2FA
        </button>
      )}

      {status === 'setup' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="bg-white p-3 rounded-xl shrink-0">
              {qrDataUrl && <img src={qrDataUrl} alt="QR Code 2FA" className="w-48 h-48" />}
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <p className="text-text-secondary">
                <strong>1.</strong> Abra o app autenticador (Google Authenticator, 1Password, Authy).
              </p>
              <p className="text-text-secondary">
                <strong>2.</strong> Escaneie o QR code ao lado. Se não funcionar, use a chave:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-page border border-border-input rounded-lg px-3 py-2 text-xs font-mono break-all">{secret}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(secret); toast.success('Chave copiada'); }}
                  className="p-2 bg-hover-bg hover:bg-hover-bg-strong rounded-lg text-text-muted"
                >
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-text-secondary">
                <strong>3.</strong> Digite o código de 6 dígitos que aparece no app:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="flex-1 bg-page border border-border-input rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-widest outline-none focus:border-purple-500"
                />
                <button
                  onClick={confirmar}
                  disabled={loadingAction || codigo.length < 6}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl"
                >
                  {loadingAction ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === 'on' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-emerald-200">
            <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
            <p>2FA ativado. Toda vez que você logar, será solicitado o código do app.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Desativar 2FA</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                placeholder="Digite código atual"
                className="flex-1 bg-page border border-border-input rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-widest outline-none focus:border-red-500"
              />
              <button
                onClick={desativar}
                disabled={loadingAction || codigo.length < 6}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl"
              >
                {loadingAction ? <Loader2 size={16} className="animate-spin" /> : 'Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de backup codes (aparece ao ativar) */}
      {showBackup && backupCodes && (
        <div className="fixed inset-0 z-[200] bg-overlay backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-solid border border-border-default rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <Shield size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-primary">Guarde seus códigos de backup</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Use-os caso perca acesso ao app. Cada código só funciona uma vez.
                </p>
              </div>
              <button onClick={() => setShowBackup(false)} className="p-1 text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-page rounded-xl border border-border-subtle font-mono text-sm">
              {backupCodes.map((c) => (
                <div key={c} className="text-text-primary tracking-wider">{c}</div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={copiarTudo}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-hover-bg hover:bg-hover-bg-strong rounded-xl text-sm font-bold"
              >
                <Copy size={14} /> Copiar todos
              </button>
              <button
                onClick={() => setShowBackup(false)}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold"
              >
                Guardei
              </button>
            </div>
            <p className="text-[10px] text-center text-text-dim mt-3">
              Esta é a única vez que você verá esses códigos. Guarde-os em local seguro.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
