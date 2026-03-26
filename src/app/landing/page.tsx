'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Clock,
  Zap,
  Users,
  BarChart3,
  ArrowRight,
  Rocket,
  MapPin,
  ScanFace,
  Shield,
  Building2,
  FileText,
  ChevronDown,
  CheckCircle2,
  Instagram,
  MessageCircle,
  Mail,
} from "lucide-react";

import { MobileCarousel } from "@/components/landing/mobile-carousel";
import { MobileMenu } from "@/components/landing/mobile-menu";
import { DesktopMenu } from "@/components/landing/desktop-menu";
import { PricingSection } from "@/components/landing/pricing-section";

import { LINKS, waLink } from '@/config/links'
import { GalleryCarousel } from "@/components/landing/gallery-carousel";
import WhatsAppFloat from "@/components/landing/WhatsAppFloat";
import ExitIntentPopup from "@/components/landing/ExitIntentPopup";
import { getLatestPosts } from "@/data/blog-posts";

export default function LandingPage() {
  const router = useRouter();

  // Analytics: rastrear visita na landing
  useEffect(() => {
    fetch('/api/public/analitico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'LANDING' }),
    }).catch(() => {});
  }, []);

  // ========= Helpers (mobile/pwa-safe external open) =========
  const isMobile = () =>
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  const isStandalone = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (window.navigator as any).standalone)

  useEffect(() => {
    if (isStandalone()) {
      // Verifica se tem sessão ativa antes de mandar pro login
      fetch('/api/auth/session').then(r => r.json()).then(session => {
        if (session?.user?.cargo === 'ADMIN') {
          router.replace('/admin');
        } else if (session?.user) {
          router.replace('/funcionario');
        } else {
          router.replace('/login');
        }
      }).catch(() => {
        router.replace('/login');
      });
    }
  }, [router]);

  const normalizeUrl = (rawUrl: string) => {
    if (!rawUrl) return ''
    const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(rawUrl)
    return hasScheme ? rawUrl : `https://${rawUrl}`
  }

  const openExternal = (rawUrl: string) => {
    const url = normalizeUrl(rawUrl)
    if (!url) return

    const target = (isMobile() || isStandalone()) ? '_self' : '_blank'

    const a = document.createElement('a')
    a.href = url
    a.target = target
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const openWhatsApp = (rawUrl: string) => {
    const webUrl = normalizeUrl(rawUrl)
    if (!webUrl) return

    if (!isMobile()) {
      openExternal(webUrl)
      return
    }

    let deep = ''
    try {
      const u = new URL(webUrl)

      if (u.hostname === 'wa.me') {
        const phone = u.pathname.replace('/', '').trim()
        const text = u.searchParams.get('text') ?? ''
        deep = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`
      }

      if (u.hostname.includes('api.whatsapp.com') && u.pathname.includes('/send')) {
        const phone = u.searchParams.get('phone') ?? ''
        const text = u.searchParams.get('text') ?? ''
        deep = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`
      }
    } catch {
      // fallback abaixo
    }

    if (deep) {
      window.location.href = deep
      setTimeout(() => {
        window.location.href = webUrl
      }, 700)
      return
    }

    window.location.href = webUrl
  }

  // ========= Gallery slides =========
  const gallerySlides = [
    {
      src: "/images/gallery/clockin-mobile.webp",
      alt: "Funcionário batendo ponto digital no celular com GPS",
      title: "Bater ponto no celular",
      subtitle: "Rápido, seguro e intuitivo.",
    },
    {
      src: "/images/gallery/clockin-face.webp",
      alt: "Reconhecimento facial para registro de ponto biométrico",
      title: "Reconhecimento facial",
      subtitle: "Mais segurança no registro.",
    },
    {
      src: "/images/gallery/reports.webp",
      alt: "Relatórios de ponto e espelho de ponto em PDF",
      title: "Relatórios completos",
      subtitle: "Exportação e insights.",
    },
    {
      src: "/images/gallery/admin-dashboard.webp",
      alt: "Painel administrativo do sistema de ponto WorkID",
      title: "Painel administrativo",
      subtitle: "Controle total em tempo real.",
    },
    {
      src: "/images/gallery/team-management.webp",
      alt: "Gestão de equipe e funcionários no WorkID",
      title: "Gestão de equipe",
      subtitle: "Cadastros, ajustes e permissões.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-purple-500/10 bg-[#0a0e27]/80 backdrop-blur-xl">
        <nav className="container mx-auto flex items-center justify-center px-4 py-3 md:justify-between md:px-6 md:py-4">
          <Link href="/" className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80">
            <Image src="/logo.png" alt="WorkID" width={40} height={40} className="rounded-xl object-contain" />
            <span className="text-xl font-extrabold text-white md:text-2xl">WorkID</span>
          </Link>

          <DesktopMenu />

          <div className="absolute right-4 flex items-center gap-2 md:static md:gap-3">
            <MobileMenu />

            <Button
              asChild
              variant="outline"
              className="hidden border-purple-500/30 bg-transparent text-white hover:border-purple-500/50 hover:bg-purple-950/30 hover:text-white md:inline-flex"
            >
              <Link href="/login">Login</Link>
            </Button>

            <Button
              asChild
              className="hidden bg-purple-600 font-bold text-white shadow-lg shadow-purple-500/50 transition-all hover:bg-purple-700 hover:shadow-purple-500/70 md:inline-flex"
            >
              <Link href="/signup">Cadastre-se</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-4 py-8 md:px-6 md:py-16 lg:py-24">
        <div className="container mx-auto">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center text-center lg:text-left">
              <Badge className="mb-4 w-fit self-center border-purple-500/50 bg-purple-950/50 text-purple-300 lg:self-start">
                14 dias gratis para testar
              </Badge>

              <h1 className="mb-4 text-balance text-[32px] font-extrabold leading-tight text-white md:mb-6 md:text-5xl lg:text-6xl xl:text-7xl">
                <span className="md:hidden">
                  Controle de ponto{' '}
                  <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                    inteligente
                  </span>{' '}
                  para sua empresa
                </span>
                <span className="hidden md:inline">
                  Controle de ponto{' '}
                  <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                    inteligente
                  </span>{' '}
                  para empresas modernas
                </span>
              </h1>

              <p className="mb-6 text-pretty text-base leading-relaxed text-gray-400 md:mb-8 md:text-lg md:text-gray-300 lg:text-xl">
                <span className="md:hidden">
                  Registre ponto por GPS, reconhecimento facial e gerencie sua equipe em tempo real. Tudo no celular.
                </span>
                <span className="hidden md:inline">
                  Chega de planilhas e relógios de ponto ultrapassados. Com o WorkID, seus funcionários batem ponto pelo celular com GPS e reconhecimento facial, e você gerencia tudo em tempo real.
                </span>
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="group w-full animate-pulse bg-purple-600 px-8 font-bold text-white shadow-xl shadow-purple-500/50 transition-all hover:animate-none hover:bg-purple-700 hover:shadow-purple-500/70 sm:w-auto [animation-duration:2s]"
                >
                  <Link href="/signup">
                    Testar gratis por 14 dias
                    <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-purple-500/30 bg-transparent font-bold text-white hover:border-purple-500/50 hover:bg-purple-950/30 hover:text-white sm:w-auto"
                >
                  <Link href="/agendar-demo">
                    Agendar demonstracao
                  </Link>
                </Button>
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Sem cartao de credito. Cancele quando quiser.
              </p>
            </div>

            <div className="relative hidden items-center justify-center lg:order-last lg:flex">
              <div className="absolute inset-0 animate-pulse bg-purple-600/20 blur-[100px]" />
              <div className="absolute inset-0 animate-pulse bg-purple-500/30 blur-[120px] [animation-delay:500ms]" />

              <div className="relative z-10 rounded-3xl bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20 p-2 shadow-2xl shadow-purple-500/50 backdrop-blur-sm">
                <div className="relative overflow-hidden rounded-2xl ring-1 ring-purple-500/30">
                  <Image
                    src="/images/phone-preview.webp"
                    alt="Tela do aplicativo WorkID de ponto digital no celular"
                    width={400}
                    height={800}
                    priority
                    sizes="(max-width: 640px) 280px, (max-width: 768px) 384px, 448px"
                    className="w-full max-w-xs transition-transform duration-500 hover:scale-105 sm:max-w-sm md:max-w-md"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Metrics Bar */}
      <section className="relative z-10 border-y border-purple-500/10 bg-purple-950/20 px-4 py-8 md:px-6 md:py-10">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-white md:text-4xl">500+</div>
              <p className="mt-1 text-sm text-gray-400">Empresas ativas</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-white md:text-4xl">10k+</div>
              <p className="mt-1 text-sm text-gray-400">Funcionarios gerenciados</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-white md:text-4xl">99.9%</div>
              <p className="mt-1 text-sm text-gray-400">Uptime garantido</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-white md:text-4xl">4.9/5</div>
              <p className="mt-1 text-sm text-gray-400">Avaliacao dos clientes</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="container mx-auto">
          <div className="mb-12 text-center md:mb-16">
            <Badge className="mb-4 border-purple-500/50 bg-purple-950/50 text-purple-300">
              Simples de usar
            </Badge>
            <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl lg:text-6xl">
              Comece em 3 passos
            </h2>
            <p className="mx-auto max-w-2xl text-balance text-lg text-gray-400">
              Configure sua empresa em minutos e comece a registrar o ponto da sua equipe hoje mesmo.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Crie sua conta",
                description: "Cadastre sua empresa em menos de 2 minutos. Sem burocracia, sem cartao de credito.",
              },
              {
                step: "02",
                title: "Adicione sua equipe",
                description: "Cadastre seus funcionarios e defina horarios, turnos e locais de trabalho.",
              },
              {
                step: "03",
                title: "Gerencie tudo",
                description: "Seus funcionarios batem ponto pelo celular e voce acompanha tudo em tempo real.",
              },
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                {i < 2 && (
                  <div className="absolute right-0 top-8 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-purple-500/30 to-transparent md:block" />
                )}
                <div className="mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 text-2xl font-extrabold text-white shadow-lg shadow-purple-500/30">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <Badge className="mb-4 border-purple-500/50 bg-purple-950/50 text-purple-300">
              Recursos
            </Badge>
            <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl lg:text-6xl">
              Tudo que sua empresa precisa
            </h2>
            <p className="mx-auto max-w-2xl text-balance text-lg text-gray-400">
              Funcionalidades completas para controle de ponto digital, gestao de equipes e conformidade trabalhista.
            </p>
          </div>

          {/* Mobile Carousel */}
          <div className="md:hidden">
            <MobileCarousel>
              <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                    <MapPin className="size-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Ponto por GPS</CardTitle>
                  <CardDescription className="text-gray-400">
                    Registro de ponto com geolocalizacao. Defina o raio permitido e garanta que o funcionario esta no local correto.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                    <ScanFace className="size-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Reconhecimento Facial</CardTitle>
                  <CardDescription className="text-gray-400">
                    Validacao biometrica por IA para evitar fraudes. Garanta que quem bate o ponto e realmente o funcionario.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                    <BarChart3 className="size-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Dashboard em Tempo Real</CardTitle>
                  <CardDescription className="text-gray-400">
                    Veja quem esta trabalhando, atrasado ou ausente. Painel completo com filtros por filial e equipe.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                    <FileText className="size-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Relatorios e Espelho de Ponto</CardTitle>
                  <CardDescription className="text-gray-400">
                    Exporte relatorios em PDF prontos para o contador. Calculo automatico de horas extras, faltas e banco de horas.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                    <Building2 className="size-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Multi-filiais</CardTitle>
                  <CardDescription className="text-gray-400">
                    Gerencie varias unidades em uma unica conta. Cada filial com suas configuracoes, horarios e equipes.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                    <Shield className="size-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Conformidade Trabalhista</CardTitle>
                  <CardDescription className="text-gray-400">
                    Em conformidade com a Portaria 671 do MTE. Registros seguros e inviolaveis para sua protecao juridica.
                  </CardDescription>
                </CardHeader>
              </Card>
            </MobileCarousel>
          </div>

          {/* Desktop Grid */}
          <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <MapPin className="size-6 text-purple-400" />,
                title: "Ponto por GPS",
                desc: "Registro de ponto com geolocalizacao. Defina o raio permitido e garanta que o funcionario esta no local correto.",
              },
              {
                icon: <ScanFace className="size-6 text-purple-400" />,
                title: "Reconhecimento Facial",
                desc: "Validacao biometrica por IA para evitar fraudes. Garanta que quem bate o ponto e realmente o funcionario.",
              },
              {
                icon: <BarChart3 className="size-6 text-purple-400" />,
                title: "Dashboard em Tempo Real",
                desc: "Veja quem esta trabalhando, atrasado ou ausente. Painel completo com filtros por filial e equipe.",
              },
              {
                icon: <FileText className="size-6 text-purple-400" />,
                title: "Relatorios e Espelho de Ponto",
                desc: "Exporte relatorios em PDF prontos para o contador. Calculo automatico de horas extras, faltas e banco de horas.",
              },
              {
                icon: <Building2 className="size-6 text-purple-400" />,
                title: "Multi-filiais",
                desc: "Gerencie varias unidades em uma unica conta. Cada filial com suas configuracoes, horarios e equipes.",
              },
              {
                icon: <Shield className="size-6 text-purple-400" />,
                title: "Conformidade Trabalhista",
                desc: "Em conformidade com a Portaria 671 do MTE. Registros seguros e inviolaveis para sua protecao juridica.",
              },
            ].map((f, i) => (
              <Card
                key={i}
                className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20"
              >
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                    {f.icon}
                  </div>
                  <CardTitle className="text-white">{f.title}</CardTitle>
                  <CardDescription className="text-gray-400">{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Section with Images */}
      <section className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="container mx-auto">
          <div className="mb-12 text-center md:mb-16">
            <Badge className="mb-4 border-purple-500/50 bg-purple-950/50 text-purple-300">
              Multiplataforma
            </Badge>
            <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl lg:text-6xl">
              No celular e no computador
            </h2>
            <p className="mx-auto max-w-2xl text-balance text-lg text-gray-400">
              Seus funcionarios batem ponto pelo celular. Voce gerencia pelo computador. Tudo sincronizado em tempo real.
            </p>
          </div>

          {/* Mobile Carousel */}
          <div className="md:hidden">
            <MobileCarousel>
              <div className="relative">
                <div className="absolute inset-0 bg-purple-600/20 blur-[80px]" />
                <Image
                  src="/images/mobile-dark.webp"
                  alt="App WorkID para funcionários no celular"
                  width={800}
                  height={600}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="relative z-10 rounded-2xl shadow-2xl shadow-purple-500/30"
                />
                <p className="relative z-10 mt-4 text-center text-sm font-medium text-gray-300">
                  App para funcionarios - rapido e intuitivo
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-purple-600/20 blur-[80px]" />
                <img
                  src="/images/laptop-preview.jpeg"
                  alt="Experiencia Desktop"
                  className="relative z-10 rounded-2xl shadow-2xl shadow-purple-500/30"
                />
                <p className="relative z-10 mt-4 text-center text-sm font-medium text-gray-300">
                  Painel administrativo completo
                </p>
              </div>
            </MobileCarousel>
          </div>

          {/* Desktop Grid */}
          <div className="hidden gap-12 md:grid md:grid-cols-2">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-600/20 blur-[80px]" />
              <img
                src="/images/mobile-dark.jpeg"
                alt="Experiencia Mobile"
                className="relative z-10 rounded-2xl shadow-2xl shadow-purple-500/30"
              />
              <p className="relative z-10 mt-4 text-center text-sm font-medium text-gray-300">
                App para funcionarios - rapido e intuitivo
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-purple-600/20 blur-[80px]" />
              <Image
                src="/images/laptop-preview.webp"
                alt="Painel administrativo WorkID no computador"
                width={900}
                height={600}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="relative z-10 rounded-2xl shadow-2xl shadow-purple-500/30"
              />
              <p className="relative z-10 mt-4 text-center text-sm font-medium text-gray-300">
                Painel administrativo completo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <Badge className="mb-4 border-purple-500/50 bg-purple-950/50 text-purple-300">
              Galeria
            </Badge>
            <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl lg:text-6xl">
              Veja o WorkID em acao
            </h2>
            <p className="mx-auto max-w-2xl text-balance text-lg text-gray-400">
              Conhega as telas do sistema e veja como e simples gerenciar o ponto da sua equipe.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-purple-600/10 blur-[80px] rounded-[40px]" />
            <div className="relative z-10">
              <GalleryCarousel slides={gallerySlides} autoPlay intervalMs={2000} />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Reseller Section */}
      <section id="revenda" className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="container mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-purple-950/40 backdrop-blur-sm">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyMTYsMTgwLDI1NCwwLjA4KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

            <div className="relative z-10 grid md:grid-cols-2 gap-8 md:gap-12 p-8 md:p-12 lg:p-16 items-center">
              {/* Texto */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Programa de Revenda</span>
                </div>

                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                  Venda o WorkID com a{' '}
                  <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    sua marca
                  </span>
                </h2>

                <p className="text-gray-400 text-base md:text-lg leading-relaxed">
                  Tenha seu proprio sistema de ponto eletronico com o logo, nome e cores da sua empresa.
                  Seus clientes nunca veem a marca WorkID — tudo com a sua identidade.
                </p>

                <div className="space-y-3">
                  {[
                    'Logo e nome personalizados em todo o sistema',
                    'Painel exclusivo para gerenciar seus clientes',
                    'Crie empresas ilimitadas dentro da sua marca',
                    'Seus clientes pagam voce, voce paga a gente',
                    'Suporte dedicado para revendedores',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <span className="text-sm text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="https://wa.me/5532935005492?text=Ol%C3%A1%2C%20tenho%20interesse%20no%20programa%20de%20revenda%20White%20Label%20do%20WorkID"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition-all hover:bg-purple-500 hover:shadow-purple-500/40 active:scale-95"
                >
                  Quero ser revendedor
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </a>
              </div>

              {/* Visual */}
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-sm">
                  {/* Card mockup */}
                  <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">P</div>
                      <div>
                        <p className="text-white font-bold">SuaMarca RH</p>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest">Painel do Revendedor</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-800/80 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-white">12</p>
                        <p className="text-[10px] text-gray-500 uppercase">Empresas</p>
                      </div>
                      <div className="bg-gray-800/80 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-400">148</p>
                        <p className="text-[10px] text-gray-500 uppercase">Usuarios</p>
                      </div>
                      <div className="bg-gray-800/80 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-purple-400">98%</p>
                        <p className="text-[10px] text-gray-500 uppercase">Ativas</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {['Padaria do Joao', 'Loja Fashion', 'Auto Center'].map((nome, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-800/60 rounded-xl px-4 py-2.5">
                          <span className="text-sm text-gray-300">{nome}</span>
                          <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-lg">ATIVO</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Glow effect */}
                  <div className="absolute -inset-4 bg-purple-500/5 rounded-3xl blur-xl -z-10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <BlogPreviewSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA Section */}
      <section className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="container mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/50 to-pink-950/30 p-12 text-center backdrop-blur-sm md:p-16">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyMTYsMTgwLDI1NCwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />

            <div className="relative z-10">
              <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl lg:text-6xl">
                Pronto para modernizar o{' '}
                <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text font-extrabold text-transparent">
                  controle de ponto?
                </span>
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-balance text-base text-gray-400 md:text-lg md:text-gray-300">
                Junte-se a centenas de empresas que ja economizam tempo e dinheiro com o WorkID.
              </p>

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button
                  asChild
                  size="lg"
                  className="animate-pulse bg-purple-600 px-8 font-bold text-white shadow-xl shadow-purple-500/50 transition-all hover:animate-none hover:bg-purple-700 hover:shadow-purple-500/70 [animation-duration:2s]"
                >
                  <Link href="/signup">
                    Comece seu teste gratuito
                    <ArrowRight className="ml-2 size-5" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-purple-500/30 bg-transparent font-medium text-white hover:border-purple-500/50 hover:bg-purple-950/30 hover:text-white"
                >
                  <Link href="/agendar-demo">
                    Agendar demonstracao
                  </Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  14 dias gratis
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  Sem cartao de credito
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  Cancele quando quiser
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="relative z-10 border-t border-purple-500/10 bg-[#0a0e27]/80 px-6 py-12 backdrop-blur-xl">
        <div className="container mx-auto">
          {/* Mobile Footer */}
          <div className="flex flex-col items-center justify-center gap-4 text-center md:hidden">
            <div className="flex items-center gap-2">
              <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/50">
                <Rocket className="size-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold text-white">WorkID</span>
            </div>
            <p className="max-w-xs text-sm text-gray-400">
              Controle de ponto inteligente para empresas modernas.
            </p>

            {/* Social links mobile */}
            <div className="flex items-center gap-4">
              <a
                href={LINKS.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-purple-950/50 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 transition-colors hover:bg-purple-900/50 hover:text-white"
              >
                <Instagram className="size-5" />
              </a>
              <a
                href={waLink(LINKS.whatsapp.messages.suporteGeral)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-purple-950/50 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 transition-colors hover:bg-purple-900/50 hover:text-white"
              >
                <MessageCircle className="size-5" />
              </a>
              <a
                href={`mailto:${LINKS.email.address}`}
                className="rounded-lg bg-purple-950/50 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 transition-colors hover:bg-purple-900/50 hover:text-white"
              >
                <Mail className="size-5" />
              </a>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              &copy; 2026 WorkID. Todos os direitos reservados.
            </p>
          </div>

          {/* Desktop Footer */}
          <div className="hidden md:block">
            <div className="grid gap-8 md:grid-cols-4">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/50">
                    <Rocket className="size-6 text-white" />
                  </div>
                  <span className="text-xl font-extrabold text-white">WorkID</span>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                  Controle de ponto inteligente para empresas modernas. Registre, gerencie e exporte com facilidade.
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={LINKS.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-purple-950/50 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 transition-colors hover:bg-purple-900/50 hover:text-white"
                  >
                    <Instagram className="size-4" />
                  </a>
                  <a
                    href={waLink(LINKS.whatsapp.messages.suporteGeral)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-purple-950/50 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 transition-colors hover:bg-purple-900/50 hover:text-white"
                  >
                    <MessageCircle className="size-4" />
                  </a>
                  <a
                    href={`mailto:${LINKS.email.address}`}
                    className="rounded-lg bg-purple-950/50 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 transition-colors hover:bg-purple-900/50 hover:text-white"
                  >
                    <Mail className="size-4" />
                  </a>
                </div>
              </div>

              <div>
                <h3 className="mb-4 font-bold text-white">Produto</h3>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li><a href="#features" className="block py-2 transition-colors hover:text-white">Recursos</a></li>
                  <li><a href="#pricing" className="block py-2 transition-colors hover:text-white">Planos e precos</a></li>
                  <li><a href="#gallery" className="block py-2 transition-colors hover:text-white">Galeria</a></li>
                  <li><a href="#faq" className="block py-2 transition-colors hover:text-white">Perguntas frequentes</a></li>
                </ul>
              </div>

              <div>
                <h3 className="mb-4 font-bold text-white">Empresa</h3>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li>
                    <a
                      href={waLink(LINKS.whatsapp.messages.suporteGeral)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block py-2 transition-colors hover:text-white"
                    >
                      Contato via WhatsApp
                    </a>
                  </li>
                  <li>
                    <a
                      href={`mailto:${LINKS.email.address}`}
                      className="block py-2 transition-colors hover:text-white"
                    >
                      {LINKS.email.address}
                    </a>
                  </li>
                  <li>
                    <a
                      href={LINKS.instagram.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block py-2 transition-colors hover:text-white"
                    >
                      {LINKS.instagram.handle}
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-4 font-bold text-white">Comece agora</h3>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li><Link href="/signup" className="block py-2 transition-colors hover:text-white">Criar conta gratis</Link></li>
                  <li><Link href="/login" className="block py-2 transition-colors hover:text-white">Fazer login</Link></li>
                  <li>
                    <Link
                      href="/agendar-demo"
                      className="block py-2 transition-colors hover:text-white"
                    >
                      Agendar demonstracao
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 border-t border-purple-500/10 pt-8 text-center text-sm text-gray-400">
              <div className="flex items-center justify-center gap-4 mb-2">
                <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
                <span className="text-gray-600">|</span>
                <Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link>
              </div>
              <p>&copy; 2026 WorkID. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp + Exit Intent */}
      <WhatsAppFloat />
      <ExitIntentPopup />
    </div>
  )
}

// ========= Blog Preview Section Component =========
function BlogPreviewSection() {
  const latestPosts = getLatestPosts(3);

  return (
    <section className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
      <div className="container mx-auto">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4 border-purple-500/30 bg-purple-500/10 text-purple-400">
            Blog
          </Badge>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Conteúdo para sua{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              gestão
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-gray-400">
            Artigos sobre ponto digital, legislação e gestão de equipes para ajudar sua empresa a crescer.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {latestPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-2xl border border-purple-500/20 bg-[#0f1333]/50 p-6 transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10"
            >
              <span className="mb-3 inline-block rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
                {post.category}
              </span>
              <h3 className="mb-2 text-lg font-semibold text-white transition-colors group-hover:text-purple-400">
                {post.title}
              </h3>
              <p className="mb-4 line-clamp-2 text-sm text-gray-400">
                {post.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {post.readTime}
                </span>
                <span className="text-sm font-medium text-purple-400 transition-colors group-hover:text-purple-300">
                  Ler mais →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-6 py-3 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-500/20"
          >
            Ver todos os artigos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ========= FAQ Section Component =========
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Como funciona o periodo de teste gratuito?",
      answer: "Ao criar sua conta, voce tem 14 dias para testar todas as funcionalidades do WorkID sem nenhum custo. Nao pedimos cartao de credito. Ao final do periodo, voce escolhe o plano que melhor se encaixa na sua empresa.",
    },
    {
      question: "Meus funcionarios precisam instalar algum aplicativo?",
      answer: "Nao. O WorkID funciona diretamente pelo navegador do celular, como um app (PWA). Basta acessar o link e adicionar a tela inicial. Nao ocupa espaco no celular e funciona offline.",
    },
    {
      question: "O sistema funciona para equipes remotas ou externas?",
      answer: "Sim! O WorkID registra o ponto por GPS, entao funciona para equipes em campo, home office ou qualquer local. Voce pode definir raios de localizacao ou liberar o ponto de qualquer lugar.",
    },
    {
      question: "Posso gerenciar varias filiais com uma unica conta?",
      answer: "Sim. Nos planos Professional e Enterprise, voce pode criar filiais vinculadas a sua empresa principal. Cada filial tem suas proprias configuracoes, funcionarios e relatorios, mas voce gerencia tudo de um so lugar.",
    },
    {
      question: "Os relatorios sao aceitos como comprovante legal?",
      answer: "Sim. O WorkID esta em conformidade com a Portaria 671 do MTE. Os relatorios incluem espelho de ponto, banco de horas e horas extras, prontos para enviar ao contador ou apresentar em caso de fiscalizacao.",
    },
    {
      question: "Posso trocar de plano a qualquer momento?",
      answer: "Sim, voce pode fazer upgrade ou downgrade do seu plano a qualquer momento pelo painel administrativo. A mudanca e aplicada imediatamente e o valor e ajustado na proxima cobranca.",
    },
  ];

  return (
    <section id="faq" className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
      <div className="container mx-auto">
        <div className="mb-12 text-center md:mb-16">
          <Badge className="mb-4 border-purple-500/50 bg-purple-950/50 text-purple-300">
            FAQ
          </Badge>
          <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl lg:text-6xl">
            Perguntas frequentes
          </h2>
          <p className="mx-auto max-w-2xl text-balance text-lg text-gray-400">
            Tire suas duvidas sobre o WorkID. Se precisar de mais ajuda, fale conosco pelo WhatsApp.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="rounded-2xl border border-purple-500/20 bg-purple-950/20 backdrop-blur-sm transition-all hover:border-purple-500/30"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left min-h-[48px]"
                >
                  <span className="text-sm font-medium text-white md:text-base">{faq.question}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-purple-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-purple-500/10 px-5 pb-5 pt-3">
                    <p className="text-sm leading-relaxed text-gray-400">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
