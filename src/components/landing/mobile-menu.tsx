'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { AboutModal } from "@/components/landing/about-modal";
import { PillarsModal } from "@/components/landing/pillars-modal";
import { ContactModal } from "@/components/landing/contact-modal";

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [pillarsOpen, setPillarsOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-purple-950/30"
          >
            <Menu className="size-6" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="right" 
          className="w-[280px] border-purple-500/20 bg-[#0a0e27]/80 backdrop-blur-xl"
        >
          <div className="flex flex-col gap-6 pt-8">
            {/* Menu Links */}
            <div className="flex flex-col gap-3 border-b border-purple-500/20 pb-6">
              <Button
                variant="ghost"
                className="w-full justify-start text-left text-gray-300 hover:bg-purple-950/30 hover:text-white"
                onClick={() => {
                  setAboutOpen(true)
                  setOpen(false)
                }}
              >
                Sobre nós
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-left text-gray-300 hover:bg-purple-950/30 hover:text-white"
                onClick={() => {
                  setPillarsOpen(true)
                  setOpen(false)
                }}
              >
                Nossos Pilares
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-left text-gray-300 hover:bg-purple-950/30 hover:text-white"
                onClick={() => {
                  setContactOpen(true)
                  setOpen(false)
                }}
              >
                Contato
              </Button>
            </div>

            {/* Auth Buttons */}
            <div className="flex flex-col gap-3">
              <Button 
                asChild
                variant="outline"
                className="w-full border-purple-500/30 bg-transparent text-white hover:border-purple-500/50 hover:bg-purple-950/30 hover:text-white"
              >
                <Link href="/signup" onClick={() => setOpen(false)}>
                  Login
                </Link>
              </Button>
              <Button 
                asChild
                className="w-full bg-purple-600 font-bold text-white shadow-lg shadow-purple-500/50 transition-all hover:bg-purple-700"
              >
                <Link href="/signup" onClick={() => setOpen(false)}>
                  Cadastre-se
                </Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modals */}
      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
      <PillarsModal open={pillarsOpen} onOpenChange={setPillarsOpen} />
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </>
  )
}
