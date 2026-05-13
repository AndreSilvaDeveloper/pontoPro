'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, Lock, Eye, EyeOff, AlertCircle, PartyPopper } from 'lucide-react';

export default function AtivarPage() {
  const router = useRouter();
  const params = useParams();
  const token = String((params as any)?.token ?? '');

  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando');
  const [erroMsg, setErroMsg] = useState('');
  const [nome, setNome] = useState('');
  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formErro, setFormErro] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`/api/auth/ativar?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({} as any));
        if (!vivo) return;
        if (!res.ok) {
          setErroMsg(data?.erro || 'Não foi possível abrir este link.');
          setEstado('erro');
          return;
        }
        setNome(data.nome || '');
        setEmpresaNome(data.empresaNome ?? null);
        setEmail(data.email || '');
        setEstado('ok');
      } catch {
        if (!vivo) return;
        setErroMsg('Não foi possível abrir este link. Verifique sua internet e tente de novo.');
        setEstado('erro');
      }
    })();
    return () => { vivo = false; };
  }, [token]);

  const primeiroNome = (nome || '').trim().split(/\s+/)[0] || '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErro('');
    const s = senha.trim();
    if (s.length < 4) { setFormErro('A senha precisa ter pelo menos 4 letras ou números.'); return; }
    if (s !== confirmar.trim()) { setFormErro('As duas senhas não estão iguais. Confira e digite de novo.'); return; }

    setSalvando(true);
    try {
      const res = await fetch('/api/auth/ativar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha: s }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setFormErro(data?.erro || 'Não foi possível salvar agora. Tente de novo.');
        setSalvando(false);
        return;
      }

      // Já entra no sistema com a senha que a pessoa acabou de criar.
      const login = await signIn('credentials', {
        email: data.email || email,
        password: s,
        redirect: false,
      });

      if (login?.error) {
        // Senha foi salva, mas o login automático não rolou — manda pra tela de entrar.
        router.replace('/login?ativado=1');
        return;
      }

      // Admin / super admin / revendedor vão direto pro painel; funcionário segue o onboarding.
      if (data.cargo === 'SUPER_ADMIN') router.replace('/saas');
      else if (data.cargo === 'REVENDEDOR') router.replace('/revendedor');
      else if (data.cargo === 'ADMIN') router.replace('/admin');
      else if (!data.temAssinatura) router.replace('/cadastrar-assinatura');
      else if (data.deveCadastrarFoto) router.replace('/cadastrar-foto');
      else if (data.deveDarCienciaCelular) router.replace('/ciencia-celular');
      else router.replace('/funcionario');
    } catch {
      setFormErro('Não foi possível salvar agora. Verifique sua internet e tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <div className="w-full max-w-md bg-surface-solid rounded-2xl border border-border-default shadow-2xl overflow-hidden">

        {estado === 'carregando' && (
          <div className="p-10 flex flex-col items-center text-center gap-4">
            <Loader2 className="animate-spin text-purple-400" size={32} />
            <p className="text-text-muted text-sm">Abrindo seu acesso…</p>
          </div>
        )}

        {estado === 'erro' && (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <AlertCircle size={30} />
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">Link indisponível</h1>
            <p className="text-text-muted text-sm leading-relaxed mb-6">{erroMsg}</p>
            <Link
              href="/login"
              className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Ir para a tela de entrar
            </Link>
          </div>
        )}

        {estado === 'ok' && (
          <>
            <div className="bg-purple-600 px-8 py-7 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-white/15 flex items-center justify-center mb-3 text-white">
                <PartyPopper size={28} />
              </div>
              <h1 className="text-white text-2xl font-bold leading-tight">
                Olá{primeiroNome ? `, ${primeiroNome}` : ''}! 👋
              </h1>
              <p className="text-purple-100 text-sm mt-1">
                {empresaNome ? <>Bem-vindo(a) à <strong>{empresaNome}</strong>.</> : 'Bem-vindo(a)!'} Falta só criar sua senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <p className="text-text-secondary text-sm leading-relaxed">
                Escolha uma senha que você não vá esquecer. Pode ser uma palavra, uma frase curta ou
                até só 4 números — o que for mais fácil pra você.
              </p>

              {email && (
                <div className="text-xs text-text-faint bg-elevated-solid border border-border-subtle rounded-lg px-3 py-2">
                  Da próxima vez você entra com este e-mail: <strong className="text-text-secondary">{email}</strong>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Crie sua senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input
                    type={mostrar ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoFocus
                    className="w-full bg-elevated-solid border border-border-input rounded-lg py-3 pl-9 pr-10 text-text-primary focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Sua senha"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrar((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-faint hover:text-text-secondary"
                    aria-label={mostrar ? 'Esconder senha' : 'Mostrar senha'}
                  >
                    {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Digite a senha de novo</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input
                    type={mostrar ? 'text' : 'password'}
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    className="w-full bg-elevated-solid border border-border-input rounded-lg py-3 pl-9 pr-3 text-text-primary focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {formErro && (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{formErro}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={salvando}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {salvando ? (<><Loader2 className="animate-spin" size={18} /> Entrando…</>) : 'Salvar senha e entrar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
