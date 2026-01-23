import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Clock, Zap, Users, BarChart3, ArrowRight, Rocket } from "lucide-react";

import { MobileCarousel } from "@/components/landing/mobile-carousel";
import { MobileMenu } from "@/components/landing/mobile-menu";
import { DesktopMenu } from "@/components/landing/desktop-menu";


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-purple-500/10 bg-[#0a0e27]/80 backdrop-blur-xl">
        <nav className="container mx-auto flex items-center justify-center px-4 py-3 md:justify-between md:px-6 md:py-4">
          <Link href="/" className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/50">
              <Rocket className="size-6 text-white" />
            </div>
            <span className="text-xl font-extrabold text-white md:text-2xl">OntimeIA</span>
          </Link>
          
          <DesktopMenu />
          
          <div className="absolute right-4 flex items-center gap-2 md:static md:gap-3">
            {/* Mobile: Hamburger Menu */}
            <MobileMenu />
            
            {/* Desktop: Text buttons */}
            <Button 
              asChild
              variant="outline"
              className="hidden border-purple-500/30 bg-transparent text-white hover:border-purple-500/50 hover:bg-purple-950/30 hover:text-white md:inline-flex"
            >
              <a href="/login" target="_blank" rel="noopener noreferrer">Login</a>
            </Button>
            
            <Button 
              asChild
              className="hidden bg-purple-600 font-bold text-white shadow-lg shadow-purple-500/50 transition-all hover:bg-purple-700 hover:shadow-purple-500/70 md:inline-flex"
            >
              <Link href="/landing/signup">Cadastre-se</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-4 py-8 md:px-6 md:py-16 lg:py-24">
        <div className="container mx-auto">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center text-center lg:text-left">
              <Badge className="mb-4 w-fit border-purple-500/50 bg-purple-950/50 text-purple-300 md:mb-6 lg:mx-0 mx-auto">
                Powered by AI
              </Badge>
              <h1 className="mb-4 text-balance text-[32px] font-extrabold leading-tight text-white md:mb-6 md:text-5xl lg:text-6xl xl:text-7xl">
                <span className="md:hidden">
                  OntimeIA: A evolução do tempo com{' '}
                  <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                    IA.
                  </span>
                </span>
                <span className="hidden md:inline">
                  OntimeIA: A evolução da gestão de tempo com{' '}
                  <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                    inteligência artificial
                  </span>
                </span>
              </h1>
              <p className="mb-6 text-pretty text-base leading-relaxed text-gray-400 md:mb-8 md:text-lg md:text-gray-300 lg:text-xl">
                <span className="md:hidden">
                  Controle seu ponto de onde estiver com uma plataforma moderna e intuitiva.
                </span>
                <span className="hidden md:inline">
                  A plataforma mais moderna do mercado, desenhada para ser rápida no desktop e imbatível no celular. Gestão de tempo inteligente na palma da sua mão.
                </span>
              </p>
              
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button 
                  asChild
                  size="lg"
                  className="group w-full animate-pulse bg-purple-600 px-8 font-bold text-white shadow-xl shadow-purple-500/50 transition-all hover:animate-none hover:bg-purple-700 hover:shadow-purple-500/70 sm:w-auto [animation-duration:2s]"
                >
                  <Link href="/signup">
                    Modernizar agora
                    <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button 
                  asChild
                  size="lg" 
                  variant="outline"
                  className="w-full border-2 border-purple-500/30 bg-transparent font-medium text-white hover:border-purple-500/50 hover:bg-purple-950/30 hover:text-white sm:w-auto"
                >
                  <Link href="#demo">Ver demonstração</Link>
                </Button>
              </div>
              
              <p className="mt-4 text-sm text-gray-500">
                Comece seu teste de 14 dias agora.
              </p>
            </div>
            
            <div className="relative hidden items-center justify-center lg:order-last lg:flex">
              {/* Pulsing Purple Aura */}
              <div className="absolute inset-0 animate-pulse bg-purple-600/20 blur-[100px]" />
              <div className="absolute inset-0 animate-pulse bg-purple-500/30 blur-[120px] [animation-delay:500ms]" />
              
              {/* Premium Image Container */}
              <div className="relative z-10 rounded-3xl bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20 p-2 shadow-2xl shadow-purple-500/50 backdrop-blur-sm">
                <div className="relative overflow-hidden rounded-2xl ring-1 ring-purple-500/30">
                  <img 
                    src="/images/phone-preview.jpeg"
                    alt="OntimeIA App Preview"
                    className="w-full max-w-xs transition-transform duration-500 hover:scale-105 sm:max-w-sm md:max-w-md"
                  />
                  {/* Glass reflection effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <Badge className="mb-4 border-purple-500/50 bg-purple-950/50 text-purple-300">
              Features
            </Badge>
            <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl lg:text-6xl">
              Recursos que impulsionam resultados
            </h2>
            <p className="mx-auto max-w-2xl text-balance text-lg text-gray-400">
              Tudo o que você precisa para gerenciar seu tempo com eficiência e inteligência artificial.
            </p>
          </div>
          
          {/* Mobile Carousel */}
          <div className="md:hidden">
            <MobileCarousel>
              <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                    <Clock className="size-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Registro Facil</CardTitle>
                  <CardDescription className="text-gray-400">
                    Registre suas horas de trabalho de forma rápida e intuitiva com apenas alguns cliques.
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                    <Zap className="size-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Equipes Remotas</CardTitle>
                  <CardDescription className="text-gray-400">
                    Gerencie equipes remotas com facilidade e acompanhe a produtividade em tempo real.
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                    <BarChart3 className="size-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Relatórios Inteligentes</CardTitle>
                  <CardDescription className="text-gray-400">
                    Análises detalhadas e insights acionáveis gerados por inteligência artificial.
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                    <Users className="size-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Colaboração</CardTitle>
                  <CardDescription className="text-gray-400">
                    Trabalhe em conjunto com sua equipe e compartilhe informações instantaneamente.
                  </CardDescription>
                </CardHeader>
              </Card>
            </MobileCarousel>
          </div>

          {/* Desktop Grid */}
          <div className="hidden gap-8 md:grid md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20">
              <CardHeader>
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                  <Clock className="size-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Registro Facil</CardTitle>
                <CardDescription className="text-gray-400">
                  Registre suas horas de trabalho de forma rápida e intuitiva com apenas alguns cliques.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20">
              <CardHeader>
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                  <Zap className="size-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Equipes Remotas</CardTitle>
                <CardDescription className="text-gray-400">
                  Gerencie equipes remotas com facilidade e acompanhe a produtividade em tempo real.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20">
              <CardHeader>
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                  <BarChart3 className="size-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Relatórios Inteligentes</CardTitle>
                <CardDescription className="text-gray-400">
                  Análises detalhadas e insights acionáveis gerados por inteligência artificial.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20">
              <CardHeader>
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                  <Users className="size-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Colaboração</CardTitle>
                <CardDescription className="text-gray-400">
                  Trabalhe em conjunto com sua equipe e compartilhe informações instantaneamente.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Visual Section with Images */}
      <section className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="container mx-auto">
          {/* Mobile Carousel */}
          <div className="md:hidden">
            <MobileCarousel>
              <div className="relative">
                <div className="absolute inset-0 bg-purple-600/20 blur-[80px]" />
                <img 
                  src="/images/mobile-dark.jpeg"
                  alt="Mobile Experience"
                  className="relative z-10 rounded-2xl shadow-2xl shadow-purple-500/30"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-purple-600/20 blur-[80px]" />
                <img 
                  src="/images/laptop-preview.jpeg"
                  alt="Desktop Experience"
                  className="relative z-10 rounded-2xl shadow-2xl shadow-purple-500/30"
                />
              </div>
            </MobileCarousel>
          </div>
          
          {/* Desktop Grid */}
          <div className="hidden gap-12 md:grid md:grid-cols-2">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-600/20 blur-[80px]" />
              <img 
                src="/images/mobile-dark.jpeg"
                alt="Mobile Experience"
                className="relative z-10 rounded-2xl shadow-2xl shadow-purple-500/30"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-purple-600/20 blur-[80px]" />
              <img 
                src="/images/laptop-preview.jpeg"
                alt="Desktop Experience"
                className="relative z-10 rounded-2xl shadow-2xl shadow-purple-500/30"
              />
            </div>
          </div>
        </div>
      </section>



      {/* Additional Gallery Section */}
      <section id="gallery" className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <Badge className="mb-4 border-purple-500/50 bg-purple-950/50 text-purple-300">
              Galeria
            </Badge>
            <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl lg:text-6xl">
              Experimente a plataforma
            </h2>
            <p className="mx-auto max-w-2xl text-balance text-lg text-gray-400">
              Veja como o OntimeIA funciona em diferentes dispositivos e ambientes de trabalho.
            </p>
          </div>
          
          {/* Mobile Carousel */}
          <div className="md:hidden">
            <MobileCarousel>
              <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <div className="absolute inset-0 bg-purple-600/10 blur-[60px]" />
                <div className="relative z-10 flex aspect-[4/5] items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-purple-600/20">
                      <Zap className="size-8 text-purple-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-400">Adicione sua imagem aqui</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <div className="absolute inset-0 bg-purple-600/10 blur-[60px]" />
                <div className="relative z-10 flex aspect-[4/5] items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-purple-600/20">
                      <Clock className="size-8 text-purple-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-400">Adicione sua imagem aqui</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <div className="absolute inset-0 bg-purple-600/10 blur-[60px]" />
                <div className="relative z-10 flex aspect-[4/5] items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-purple-600/20">
                      <BarChart3 className="size-8 text-purple-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-400">Adicione sua imagem aqui</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
                <div className="absolute inset-0 bg-purple-600/10 blur-[60px]" />
                <div className="relative z-10 flex aspect-[4/5] items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-purple-600/20">
                      <Users className="size-8 text-purple-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-400">Adicione sua imagem aqui</p>
                  </div>
                </div>
              </div>
            </MobileCarousel>
          </div>

          {/* Desktop Grid */}
          <div className="hidden gap-8 md:grid md:grid-cols-2 lg:grid-cols-4">
            {/* Image Placeholder 1 */}
            <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm transition-all hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/30">
              <div className="absolute inset-0 bg-purple-600/10 blur-[60px]" />
              <div className="relative z-10 flex aspect-[4/5] items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-purple-600/20">
                    <Zap className="size-8 text-purple-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">Adicione sua imagem aqui</p>
                </div>
              </div>
            </div>

            {/* Image Placeholder 2 */}
            <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm transition-all hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/30">
              <div className="absolute inset-0 bg-purple-600/10 blur-[60px]" />
              <div className="relative z-10 flex aspect-[4/5] items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-purple-600/20">
                    <Clock className="size-8 text-purple-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">Adicione sua imagem aqui</p>
                </div>
              </div>
            </div>

            {/* Image Placeholder 3 */}
            <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm transition-all hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/30">
              <div className="absolute inset-0 bg-purple-600/10 blur-[60px]" />
              <div className="relative z-10 flex aspect-[4/5] items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-purple-600/20">
                    <BarChart3 className="size-8 text-purple-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">Adicione sua imagem aqui</p>
                </div>
              </div>
            </div>

            {/* Image Placeholder 4 */}
            <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm transition-all hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/30">
              <div className="absolute inset-0 bg-purple-600/10 blur-[60px]" />
              <div className="relative z-10 flex aspect-[4/5] items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-purple-600/20">
                    <Users className="size-8 text-purple-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">Adicione sua imagem aqui</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="container mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/50 to-pink-950/30 p-12 text-center backdrop-blur-sm md:p-16">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyMTYsMTgwLDI1NCwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
            
            <div className="relative z-10">
              <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl lg:text-6xl">
                Eleve sua empresa ao{' '}
                <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text font-extrabold text-transparent">
                  próximo nível
                </span>
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-balance text-base text-gray-400 md:text-lg md:text-gray-300">
                A escolha de empresas modernas para gerir o tempo
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
                  <Link href="#demo">Agendar demonstração</Link>
                </Button>
              </div>
              
              <p className="mt-6 text-sm text-gray-400">
                Teste grátis por 14 dias • Sem cartão de crédito
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="relative z-10 border-t border-purple-500/10 bg-[#0a0e27]/80 px-6 py-12 backdrop-blur-xl">
        <div className="container mx-auto">
          {/* Mobile Footer - Simple Version */}
          <div className="flex flex-col items-center justify-center gap-4 text-center md:hidden">
            <div className="flex items-center gap-2">
              <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/50">
                <Rocket className="size-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold text-white">OntimeIA</span>
            </div>
            <p className="max-w-xs text-sm text-gray-400">
              A evolução da gestão de tempo com inteligência artificial.
            </p>
            <p className="mt-4 text-xs text-gray-500">
              &copy; 2026 OntimeIA. Todos os direitos reservados.
            </p>
          </div>

          {/* Desktop Footer - Full Version */}
          <div className="hidden md:block">
            <div className="grid gap-8 md:grid-cols-4">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/50">
                    <Rocket className="size-6 text-white" />
                  </div>
                  <span className="text-xl font-extrabold text-white">OntimeIA</span>
                </div>
                <p className="text-sm text-gray-400">
                  A evolução da gestão de tempo com inteligência artificial.
                </p>
              </div>
              
              <div>
                <h3 className="mb-4 font-bold text-white">Produto</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link href="#gallery" className="transition-colors hover:text-white">Galeria</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="mb-4 font-bold text-white">Empresa</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link href="#" className="transition-colors hover:text-white">Sobre nós</Link></li>
                  <li><Link href="#contact" className="transition-colors hover:text-white">Contato</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="mb-4 font-bold text-white">Legal</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link href="#" className="transition-colors hover:text-white">Privacidade</Link></li>
                  <li><Link href="#" className="transition-colors hover:text-white">Termos de uso</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 border-t border-purple-500/10 pt-8 text-center text-sm text-gray-400">
              <p>&copy; 2026 OntimeIA. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
