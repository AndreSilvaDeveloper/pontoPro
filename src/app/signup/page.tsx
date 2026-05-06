'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import ThemeToggle from '@/components/ThemeToggle'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import {
  Eye,
  EyeOff,
  Smartphone,
  Building2,
  User,
  Mail,
  Lock,
  CheckCircle2,
  Share,
  PlusSquare,
  MoreVertical,
  Check,
  Phone,
} from 'lucide-react'

import { PLANOS, PLANO_DEFAULT, getPrecoAnual, type PlanoId } from '@/config/planos'
import { validarCNPJ } from '@/utils/cnpj'
import { trackEvent, trackLead } from '@/lib/analytics'
import CupomInput from '@/components/CupomInput'

const PLANOS_ORDER: PlanoId[] = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE']

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Plano da URL ou default
  const planoFromUrl = (searchParams.get('plano') ?? '').toUpperCase()
  const initialPlano: PlanoId = (planoFromUrl in PLANOS ? planoFromUrl : PLANO_DEFAULT) as PlanoId

  // Plano selecionado
  const [plano, setPlano] = useState<PlanoId>(initialPlano)
  const [cupomCodigo, setCupomCodigo] = useState<string | null>(null)

  // Dados do SaaS
  const [empresaNome, setEmpresaNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [adminNome, setAdminNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [aceitar, setAceitar] = useState(false)

  // UI
  const [loading, setLoading] = useState(false)
  const [showSenha, setShowSenha] = useState(false)
  const [showSenha2, setShowSenha2] = useState(false)

  // Verificação WhatsApp
  const [etapa, setEtapa] = useState<'dados' | 'codigo'>('dados')
  const [codigoWa, setCodigoWa] = useState('')
  const [waCanal, setWaCanal] = useState<'whatsapp' | 'sms' | null>(null)
  const [reenviando, setReenviando] = useState(false)

  // PWA (versão curta, igual a pegada do login)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showTutorial, setShowTutorial] = useState<'IOS' | 'ANDROID' | null>(null)

  const formatarTelefone = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const senhaOk = useMemo(() => senha.length >= 8 && senha === senha2, [senha, senha2])

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua)
    setIsIOS(ios)

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Analytics: rastrear visita na página de signup
    fetch('/api/public/analitico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'SIGNUP_VISIT' }),
    }).catch(() => {})

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice?.then((choiceResult: any) => {
        if (choiceResult?.outcome === 'accepted') setDeferredPrompt(null)
      })
      return
    }
    if (isIOS) setShowTutorial('IOS')
    else setShowTutorial('ANDROID')
  }

  const finalizarCadastro = async () => {
    setLoading(true)
    const t = toast.loading('Criando sua conta...')

    try {
      const res = await fetch('/api/public/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaNome,
          cnpj,
          adminNome,
          email,
          telefone,
          password: senha,
          aceitarTermos: aceitar,
          plano,
          cupom: cupomCodigo,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        toast.error(data?.erro || 'Não foi possível concluir o cadastro.', { id: t })
        setLoading(false)
        return
      }

      toast.success('Conta criada! Entrando no sistema...', { id: t })

      trackEvent('signup_completed', { plano })
      trackLead({ tipo: 'signup', plano })

      const login = await signIn('credentials', {
        redirect: false,
        email: email.trim().toLowerCase(),
        password: senha,
      })

      if (login?.error) {
        toast.warning('Cadastro criado, mas não conseguimos logar automaticamente. Faça login.', { duration: 5000 })
        router.push('/login')
        return
      }

      router.push('/obrigado')
    } catch (err) {
      toast.error('Erro de conexão.', { id: t })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!senhaOk) {
      toast.warning('Confira a senha (mínimo 8 caracteres e confirmação igual).')
      return
    }
    if (!aceitar) {
      toast.warning('Você precisa aceitar os termos para continuar.')
      return
    }

    const telefoneDigits = telefone.replace(/\D/g, '')
    if (telefoneDigits.length < 10 || telefoneDigits.length > 11) {
      toast.warning('Informe um WhatsApp válido (DDD + número).')
      return
    }

    const cnpjDigits = cnpj.replace(/\D/g, '')
    if (cnpjDigits && !validarCNPJ(cnpjDigits)) {
      toast.warning('CNPJ inválido. Verifique os dígitos ou deixe em branco.')
      return
    }

    setLoading(true)
    const t = toast.loading('Verificando WhatsApp...')

    try {
      const res = await fetch('/api/public/signup/verificar-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone }),
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        toast.error(data?.erro || 'Não foi possível enviar o código.', { id: t })
        setLoading(false)
        return
      }

      // Verificação desligada no painel — segue direto pro signup
      if (data.skipVerification) {
        toast.dismiss(t)
        await finalizarCadastro()
        return
      }

      // Verificação ligada — abre etapa de código
      setWaCanal(data.canal)
      setEtapa('codigo')
      setLoading(false)
      toast.success(`Código enviado por ${data.canal === 'whatsapp' ? 'WhatsApp' : 'SMS'}.`, { id: t })
    } catch {
      toast.error('Erro de conexão.', { id: t })
      setLoading(false)
    }
  }

  const confirmarCodigo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(codigoWa.trim())) {
      toast.warning('Informe os 6 dígitos do código.')
      return
    }

    setLoading(true)
    const t = toast.loading('Validando código...')

    try {
      const res = await fetch('/api/public/signup/verificar-whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, codigo: codigoWa.trim() }),
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        toast.error(data?.erro || 'Código inválido.', { id: t })
        setLoading(false)
        return
      }

      toast.dismiss(t)
      await finalizarCadastro()
    } catch {
      toast.error('Erro de conexão.', { id: t })
      setLoading(false)
    }
  }

  const reenviarCodigo = async () => {
    setReenviando(true)
    try {
      const res = await fetch('/api/public/signup/verificar-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        toast.error(data?.erro || 'Não foi possível reenviar.')
        return
      }
      setWaCanal(data.canal)
      toast.success(`Código reenviado por ${data.canal === 'whatsapp' ? 'WhatsApp' : 'SMS'}.`)
    } catch {
      toast.error('Erro de conexão.')
    } finally {
      setReenviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-page">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Animated Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      {/* Modal tutorial PWA */}
      {showTutorial && (
        <div
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowTutorial(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0f1535]/95 to-[#0a0e27]/95 p-6 shadow-2xl shadow-purple-500/20"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Instalar aplicativo</h3>
              <button className="text-text-muted hover:text-text-primary" onClick={() => setShowTutorial(null)}>
                ×
              </button>
            </div>

            {showTutorial === 'IOS' ? (
              <div className="mt-4 space-y-3 rounded-xl border border-purple-500/20 bg-page/50 p-4 text-sm text-text-secondary">
                <p className="flex items-center gap-3">
                  <Share className="size-5 text-blue-400" /> 1. Toque em <b>Compartilhar</b>
                </p>
                <p className="flex items-center gap-3">
                  <PlusSquare className="size-5 text-text-primary" /> 2. <b>Adicionar à Tela de Início</b>
                </p>
                <p className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-emerald-400" /> 3. Confirme em <b>Adicionar</b>
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 rounded-xl border border-purple-500/20 bg-page/50 p-4 text-sm text-text-secondary">
                <p className="flex items-center gap-3">
                  <MoreVertical className="size-5 text-text-primary" /> 1. Abra o <b>Menu</b> do navegador
                </p>
                <p className="flex items-center gap-3">
                  <Smartphone className="size-5 text-blue-400" /> 2. Toque em <b>Instalar aplicativo</b>
                </p>
              </div>
            )}

            <Button className="mt-4 w-full bg-white text-slate-950 hover:bg-slate-200" onClick={() => setShowTutorial(null)}>
              Entendi
            </Button>
          </div>
        </div>
      )}

      <div className="relative z-10 flex min-h-screen items-start justify-center px-6 py-12 lg:items-center">
        <div className="w-full max-w-md lg:max-w-5xl">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center justify-center">
              <img
                src="/logo.png"
                alt="WorkID"
                className="h-20 w-auto object-contain select-none drop-shadow-[0_8px_32px_rgba(168,85,247,0.3)]"
                draggable={false}
              />
            </Link>
            <p className="mt-2 text-sm text-text-muted">Gestão Inteligente de Ponto</p>
          </div>

          <div className="lg:grid lg:grid-cols-[minmax(0,_460px)_minmax(0,_1fr)] lg:gap-8 lg:items-start">
          <Card className="border-purple-500/20 bg-gradient-to-b from-[#0f1535]/95 to-[#0a0e27]/95 shadow-2xl shadow-purple-500/20 backdrop-blur-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-text-primary">Criar conta</CardTitle>
              <CardDescription className="text-text-muted">
                Crie sua empresa e o primeiro acesso de administrador
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {etapa === 'codigo' ? (
                <form onSubmit={confirmarCodigo} className="space-y-4">
                  <div className="rounded-xl border border-purple-500/20 bg-page/50 p-4 text-sm text-text-secondary">
                    Enviamos um código de 6 dígitos por <b className="text-text-primary">{waCanal === 'whatsapp' ? 'WhatsApp' : 'SMS'}</b> para <b className="text-text-primary">{telefone}</b>.
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="codigoWa" className="text-sm font-medium text-text-secondary">
                      CÓDIGO DE VERIFICAÇÃO
                    </Label>
                    <Input
                      id="codigoWa"
                      value={codigoWa}
                      onChange={(e) => setCodigoWa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      maxLength={6}
                      placeholder="000000"
                      className="text-center text-2xl font-mono tracking-[0.5em] border-purple-500/20 bg-page/50 text-text-primary placeholder:text-text-faint focus:border-purple-500/50 focus:ring-purple-500/50"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || codigoWa.length !== 6}
                    className="w-full bg-purple-600 py-6 text-base font-bold text-white shadow-lg shadow-purple-500/50 transition-all hover:bg-purple-500 hover:shadow-purple-500/70 disabled:opacity-70"
                  >
                    {loading ? 'VALIDANDO...' : 'CONFIRMAR E CRIAR CONTA →'}
                  </Button>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => { setEtapa('dados'); setCodigoWa('') }}
                      className="text-text-muted hover:text-text-primary"
                    >
                      ← Voltar e corrigir o número
                    </button>
                    <button
                      type="button"
                      onClick={reenviarCodigo}
                      disabled={reenviando}
                      className="text-purple-300 hover:text-purple-200 disabled:opacity-50"
                    >
                      {reenviando ? 'Reenviando...' : 'Reenviar código'}
                    </button>
                  </div>
                </form>
              ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                {/* Seletor de plano */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-text-secondary">
                    ESCOLHA SEU PLANO
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {PLANOS_ORDER.map((id) => {
                      const p = PLANOS[id]
                      const selecionado = plano === id
                      const isPopular = id === 'PROFESSIONAL'
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPlano(id)}
                          className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-2.5 text-center transition-all ${
                            selecionado
                              ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/30'
                              : 'border-purple-500/20 bg-page/50 hover:border-purple-500/50'
                          }`}
                        >
                          {isPopular && (
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-950">
                              Popular
                            </span>
                          )}
                          {selecionado && (
                            <Check
                              className="absolute right-1 top-1 size-3.5 text-purple-300"
                              strokeWidth={3}
                            />
                          )}
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${selecionado ? 'text-purple-200' : 'text-text-muted'}`}>
                            {p.nome}
                          </span>
                          <span className={`mt-0.5 text-base font-bold leading-tight ${selecionado ? 'text-white' : 'text-text-primary'}`}>
                            R$ {p.preco.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[9px] text-text-faint">
                            /mês · {p.maxFuncionarios} func.
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-text-faint">
                    {PLANOS[plano].descricao} · {PLANOS[plano].reconhecimentoFacial ? 'com' : 'sem'} reconhecimento facial
                  </p>
                </div>

                {/* Nome */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium text-text-secondary">
                    SEU NOME
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-text-faint" />
                    <Input
                      id="name"
                      value={adminNome}
                      onChange={(e) => setAdminNome(e.target.value)}
                      type="text"
                      placeholder="Seu nome completo"
                      className="pl-10 border-purple-500/20 bg-page/50 text-text-primary placeholder:text-text-faint focus:border-purple-500/50 focus:ring-purple-500/50"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Empresa */}
                <div className="space-y-1.5">
                  <Label htmlFor="empresa" className="text-sm font-medium text-text-secondary">
                    NOME DA EMPRESA
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-text-faint" />
                    <Input
                      id="empresa"
                      value={empresaNome}
                      onChange={(e) => setEmpresaNome(e.target.value)}
                      placeholder="Ex: Padaria do João"
                      className="pl-10 border-purple-500/20 bg-page/50 text-text-primary placeholder:text-text-faint focus:border-purple-500/50 focus:ring-purple-500/50"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-text-secondary">
                    EMAIL
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-text-faint" />
                    <Input
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10 border-purple-500/20 bg-page/50 text-text-primary placeholder:text-text-faint focus:border-purple-500/50 focus:ring-purple-500/50"
                      required
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="space-y-1.5">
                  <Label htmlFor="telefone" className="text-sm font-medium text-text-secondary">
                    WHATSAPP
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-text-faint" />
                    <Input
                      id="telefone"
                      value={telefone}
                      onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                      type="tel"
                      inputMode="numeric"
                      placeholder="(11) 91234-5678"
                      className="pl-10 border-purple-500/20 bg-page/50 text-text-primary placeholder:text-text-faint focus:border-purple-500/50 focus:ring-purple-500/50"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-text-faint">
                    Usamos pra te ajudar caso precise de suporte na configuração.
                  </p>
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-text-secondary">
                    SENHA
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-text-faint" />
                    <Input
                      id="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      type={showSenha ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      className="pl-10 border-purple-500/20 bg-page/50 pr-10 text-text-primary placeholder:text-text-faint focus:border-purple-500/50 focus:ring-purple-500/50"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                      aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showSenha ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirmação de senha */}
                <div className="space-y-1.5">
                  <Label htmlFor="password2" className="text-sm font-medium text-text-secondary">
                    CONFIRMAR SENHA
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-text-faint" />
                    <Input
                      id="password2"
                      value={senha2}
                      onChange={(e) => setSenha2(e.target.value)}
                      type={showSenha ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      className={`pl-10 bg-page/50 pr-10 text-text-primary placeholder:text-text-faint focus:ring-purple-500/50 ${
                        senha2.length > 0 && senha !== senha2
                          ? 'border-red-500/40 focus:border-red-500'
                          : 'border-purple-500/20 focus:border-purple-500/50'
                      }`}
                      required
                      minLength={8}
                    />
                  </div>
                  {senha2.length > 0 && senha !== senha2 && (
                    <p className="text-xs text-red-400">As senhas não coincidem.</p>
                  )}
                </div>

                {/* Termos */}
                <label className="flex items-start gap-3 rounded-lg border border-purple-500/20 bg-page/50 p-3 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={aceitar}
                    onChange={(e) => setAceitar(e.target.checked)}
                    className="mt-1 size-4 accent-purple-500"
                  />
                  <span>
                    Aceito os{" "}
                    <Link
                      href="/termos"
                      target="_blank"
                      className="text-purple-300 hover:text-purple-200 underline underline-offset-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link
                      href="/privacidade"
                      target="_blank"
                      className="text-purple-300 hover:text-purple-200 underline underline-offset-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>

                <CupomInput
                  plano={plano}
                  ciclo="MONTHLY"
                  valorMensal={PLANOS[plano].preco}
                  onChange={setCupomCodigo}
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 py-6 text-base font-bold text-white shadow-lg shadow-purple-500/50 transition-all hover:bg-purple-500 hover:shadow-purple-500/70 disabled:opacity-70"
                >
                  {loading ? 'CRIANDO...' : 'COMEÇAR GRÁTIS →'}
                </Button>

                <div className="flex items-center justify-center gap-4 text-[10px] text-text-dim">
                  <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-emerald-500" /> 14 dias grátis</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-emerald-500" /> Sem cartão</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-emerald-500" /> Cancele quando quiser</span>
                </div>
              </form>
              )}

              {/* Opções do App */}
              <div className="relative mt-6 rounded-lg border border-purple-500/20 bg-page/50 p-4">
                <p className="mb-2 text-center text-xs font-medium uppercase text-text-muted">
                  Opções do App
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleInstallClick}
                  className="w-full border-purple-500/20 bg-transparent text-text-secondary hover:border-purple-500/40 hover:bg-purple-950/30"
                >
                  <Smartphone className="mr-2 size-5" />
                  Instalar Aplicativo
                </Button>
              </div>

              <p className="text-center text-xs text-text-faint">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-purple-400 hover:text-purple-300">
                  Fazer login
                </Link>
              </p>

              <p className="text-center text-xs text-text-dim">
                © 2026 WorkID • Tecnologia em Gestão
              </p>
            </CardContent>
          </Card>

          <aside className="hidden lg:block lg:sticky lg:top-12 mt-8 lg:mt-0">
            <PlanoDetalheCard plano={plano} />
          </aside>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanoDetalheCard({ plano }: { plano: PlanoId }) {
  const p = PLANOS[plano]
  const isPopular = plano === 'PROFESSIONAL'

  const suporteLabel = {
    EMAIL: 'por e-mail',
    WHATSAPP_EMAIL: 'WhatsApp + e-mail',
    PRIORITARIO: 'prioritário 24/7',
  }[p.suporte]

  const filiaisLabel =
    p.maxFiliais === -1
      ? 'Filiais ilimitadas'
      : p.maxFiliais === 0
        ? 'Apenas matriz (sem filiais)'
        : `Matriz + ${p.maxFiliais} ${p.maxFiliais === 1 ? 'filial' : 'filiais'}`

  type Linha = { texto: string; ativo: boolean; destaque?: boolean }
  const features: Linha[] = [
    { texto: `${p.maxFuncionarios} funcionários inclusos`, ativo: true },
    { texto: `${p.maxAdmins} ${p.maxAdmins === 1 ? 'administrador' : 'administradores'}`, ativo: true },
    { texto: filiaisLabel, ativo: true },
    { texto: 'Reconhecimento facial', ativo: p.reconhecimentoFacial },
    { texto: `Relatórios PDF ${p.relatoriosPdf === 'COMPLETO' ? 'completos' : 'básicos'}`, ativo: true },
    { texto: `Suporte ${suporteLabel}`, ativo: true },
    {
      texto: p.totemIncluso
        ? 'Estação de ponto INCLUSA'
        : `Estação de ponto: + R$ ${p.totemAddonMatriz.toFixed(2).replace('.', ',')}/mês (opcional)`,
      ativo: true,
      destaque: p.totemIncluso,
    },
  ]

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0f1535]/95 to-[#0a0e27]/95 p-6 shadow-2xl shadow-purple-500/20 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-purple-300/80">Você escolheu</p>
          <h3 className="mt-1 text-2xl font-bold text-text-primary">{p.nome}</h3>
          <p className="mt-0.5 text-xs text-text-muted">{p.descricao}</p>
        </div>
        {isPopular && (
          <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30">
            Popular
          </span>
        )}
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold text-white">
          R$ {p.preco.toFixed(2).replace('.', ',')}
        </span>
        <span className="text-sm text-text-muted">/mês</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-bold text-emerald-300">
          14 dias grátis
        </span>
        <span className="text-text-faint">sem cartão · cancele quando quiser</span>
      </div>

      <hr className="my-5 border-purple-500/20" />

      <ul className="space-y-2.5 text-sm">
        {features.map((f, idx) => (
          <li
            key={idx}
            className={`flex items-start gap-2.5 ${
              f.ativo ? (f.destaque ? 'text-emerald-300 font-semibold' : 'text-text-secondary') : 'text-text-faint line-through'
            }`}
          >
            <Check
              className={`mt-0.5 size-4 shrink-0 ${f.ativo ? 'text-emerald-400' : 'text-slate-700'}`}
              strokeWidth={3}
            />
            <span>{f.texto}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-xl border border-purple-500/15 bg-purple-500/5 p-3 text-[11px] leading-relaxed text-text-muted">
        💡 Os valores cobrados são proporcionais ao uso real:
        excedente de <b className="text-text-secondary">funcionários</b> custa{' '}
        <b className="text-text-primary">R$ {p.extraFuncionario.toFixed(2).replace('.', ',')}</b>/mês cada;{' '}
        <b className="text-text-secondary">administradores</b> extras{' '}
        <b className="text-text-primary">R$ {p.extraAdmin.toFixed(2).replace('.', ',')}</b>/mês cada.
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
