'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu, ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'

export function MobileMenu() {
  const [open, setOpen] = React.useState(false)

  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="border-purple-500/30 bg-transparent text-white hover:border-purple-500/50 hover:bg-purple-950/30 hover:text-white md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[86vw] max-w-[360px] border-purple-500/20 bg-[#0a0e27]/95 text-white backdrop-blur-xl"
      >
        {/* ✅ FIX Radix: Dialog/Sheet precisa ter um Title dentro do Content (pode ser invisível) */}
        <SheetTitle className="sr-only">Menu</SheetTitle>

        <div className="flex flex-col gap-4 pt-6">
          <div className="space-y-2">
            <Link
              href="/#features"
              onClick={close}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/5 hover:text-white"
            >
              Features
            </Link>

            <Link
              href="/#gallery"
              onClick={close}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/5 hover:text-white"
            >
              Galeria
            </Link>

            <Link
              href="/#contact"
              onClick={close}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/5 hover:text-white"
            >
              Contato
            </Link>
          </div>

          <div className="mt-2 grid gap-2">
            {/* ✅ Login agora vai para /login */}
            <Button
              asChild
              variant="outline"
              className="w-full border-purple-500/30 bg-transparent font-bold text-white hover:border-purple-500/50 hover:bg-purple-950/30 hover:text-white"
            >
              <Link href="/login" onClick={close}>
                Login
              </Link>
            </Button>

            {/* ✅ Cadastro continua em /signup */}
            <Button
              asChild
              className="w-full bg-purple-600 font-bold text-white shadow-lg shadow-purple-500/40 hover:bg-purple-700"
            >
              <Link href="/signup" onClick={close}>
                Cadastre-se
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
