'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import {
  Rocket,
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
} from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()

  // Dados do SaaS
  const [empresaNome, setEmpresaNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [adminNome, setAdminNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [aceitar, setAceitar] = useState(false)

  // UI
  const [loading, setLoading] = useState(false)
  const [showSenha, setShowSenha] = useState(false)
  const [showSenha2, setShowSenha2] = useState(false)

  // PWA (versão curta, igual a pegada do login)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showTutorial, setShowTutorial] = useState<'IOS' | 'ANDROID' | null>(null)

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
          password: senha,
          aceitarTermos: aceitar,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        toast.error(data?.erro || 'Não foi possível concluir o cadastro.', { id: t })
        setLoading(false)
        return
      }

      toast.success('Conta criada! Entrando no sistema...', { id: t })

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

      router.push('/admin')
    } catch (err) {
      toast.error('Erro de conexão.', { id: t })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      {/* Modal tutorial PWA */}
      {showTutorial && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowTutorial(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#0f1535]/95 to-[#0a0e27]/95 p-6 shadow-2xl shadow-purple-500/20"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Instalar aplicativo</h3>
              <button className="text-gray-400 hover:text-white" onClick={() => setShowTutorial(null)}>
                ×
              </button>
            </div>

            {showTutorial === 'IOS' ? (
              <div className="mt-4 space-y-3 rounded-xl border border-purple-500/20 bg-[#0a0e27]/50 p-4 text-sm text-gray-300">
                <p className="flex items-center gap-3">
                  <Share className="size-5 text-blue-400" /> 1. Toque em <b>Compartilhar</b>
                </p>
                <p className="flex items-center gap-3">
                  <PlusSquare className="size-5 text-white" /> 2. <b>Adicionar à Tela de Início</b>
                </p>
                <p className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-emerald-400" /> 3. Confirme em <b>Adicionar</b>
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 rounded-xl border border-purple-500/20 bg-[#0a0e27]/50 p-4 text-sm text-gray-300">
                <p className="flex items-center gap-3">
                  <MoreVertical className="size-5 text-white" /> 1. Abra o <b>Menu</b> do navegador
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

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/50">
                <Rocket className="size-7 text-white" />
              </div>
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold text-white">OntimeIA</h1>
            <p className="mt-2 text-sm text-gray-400">Gestão Inteligente de Ponto</p>
          </div>

          <Card className="border-purple-500/20 bg-gradient-to-b from-[#0f1535]/95 to-[#0a0e27]/95 shadow-2xl shadow-purple-500/20 backdrop-blur-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-white">Criar conta</CardTitle>
              <CardDescription className="text-gray-400">
                Crie sua empresa e o primeiro acesso de administrador
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={onSubmit} className="space-y-4">
                {/* Empresa */}
                <div className="space-y-2">
                  <Label htmlFor="empresa" className="text-sm font-medium text-gray-300">
                    EMPRESA
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                    <Input
                      id="empresa"
                      value={empresaNome}
                      onChange={(e) => setEmpresaNome(e.target.value)}
                      placeholder="Ex: OntimeIA Tecnologia"
                      className="pl-10 border-purple-500/20 bg-[#0a0e27]/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/50"
                      required
                    />
                  </div>
                </div>

                {/* CNPJ opcional */}
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-sm font-medium text-gray-300">
                    CNPJ (OPCIONAL)
                  </Label>
                  <Input
                    id="cnpj"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="border-purple-500/20 bg-[#0a0e27]/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/50"
                  />
                </div>

                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-300">
                    NOME COMPLETO
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                    <Input
                      id="name"
                      value={adminNome}
                      onChange={(e) => setAdminNome(e.target.value)}
                      type="text"
                      placeholder="Seu nome completo"
                      className="pl-10 border-purple-500/20 bg-[#0a0e27]/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/50"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                    EMAIL
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                    <Input
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="exemplo@ontimeia.com"
                      className="pl-10 border-purple-500/20 bg-[#0a0e27]/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/50"
                      required
                    />
                  </div>
                </div>

                {/* Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                    SENHA
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                    <Input
                      id="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      type={showSenha ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 border-purple-500/20 bg-[#0a0e27]/50 pr-10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showSenha ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Mínimo de 8 caracteres.</p>
                </div>

                {/* Confirmar senha */}
                <div className="space-y-2">
                  <Label htmlFor="password2" className="text-sm font-medium text-gray-300">
                    CONFIRMAR SENHA
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                    <Input
                      id="password2"
                      value={senha2}
                      onChange={(e) => setSenha2(e.target.value)}
                      type={showSenha2 ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`pl-10 pr-10 bg-[#0a0e27]/50 text-white placeholder:text-gray-500 focus:ring-purple-500/50 ${
                        !senha2
                          ? 'border-purple-500/20 focus:border-purple-500/50'
                          : senhaOk
                            ? 'border-emerald-500/30 focus:border-emerald-500/60'
                            : 'border-red-500/30 focus:border-red-500/60'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha2((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showSenha2 ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>

                  {!!senha2 && !senhaOk && (
                    <p className="text-xs text-red-300">As senhas não conferem ou têm menos de 8 caracteres.</p>
                  )}
                </div>

                {/* Termos */}
                <label className="flex items-center gap-3 rounded-lg border border-purple-500/20 bg-[#0a0e27]/50 p-3 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={aceitar}
                    onChange={(e) => setAceitar(e.target.checked)}
                    className="size-4 accent-purple-500"
                  />
                  Aceito os termos e a política de privacidade.
                </label>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 py-6 text-base font-bold text-white shadow-lg shadow-purple-500/50 transition-all hover:bg-purple-700 hover:shadow-purple-500/70 disabled:opacity-70"
                >
                  {loading ? 'CRIANDO...' : 'CRIAR CONTA →'}
                </Button>
              </form>

              {/* Opções do App */}
              <div className="relative mt-6 rounded-lg border border-purple-500/20 bg-[#0a0e27]/50 p-4">
                <p className="mb-2 text-center text-xs font-medium uppercase text-gray-400">
                  Opções do App
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleInstallClick}
                  className="w-full border-purple-500/20 bg-transparent text-gray-300 hover:border-purple-500/40 hover:bg-purple-950/30"
                >
                  <Smartphone className="mr-2 size-5" />
                  Instalar Aplicativo
                </Button>
              </div>

              <p className="text-center text-xs text-gray-500">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-purple-400 hover:text-purple-300">
                  Fazer login
                </Link>
              </p>

              <p className="text-center text-xs text-gray-600">
                © 2026 OntimeIA • Tecnologia em Gestão
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
