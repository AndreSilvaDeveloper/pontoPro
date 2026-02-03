'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AboutModal } from "@/components/landing/about-modal";
import { PillarsModal } from "@/components/landing/pillars-modal";
import { ContactModal } from "@/components/landing/contact-modal";


export function DesktopMenu() {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [pillarsOpen, setPillarsOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  return (
    <>
      <div className="hidden items-center gap-8 md:flex">
        <Button
          variant="ghost"
          className="cursor-pointer text-sm font-medium text-gray-300 transition-colors hover:bg-transparent hover:text-white"
          onClick={() => setAboutOpen(true)}
        >
          Sobre nós
        </Button>
        <Button
          variant="ghost"
          className="cursor-pointer text-sm font-medium text-gray-300 transition-colors hover:bg-transparent hover:text-white"
          onClick={() => setPillarsOpen(true)}
        >
          Nossos Pilares
        </Button>
        <Button
          variant="ghost"
          className="cursor-pointer text-sm font-medium text-gray-300 transition-colors hover:bg-transparent hover:text-white"
          onClick={() => setContactOpen(true)}
        >
          Contato
        </Button>
      </div>

      {/* Modals */}
      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
      <PillarsModal open={pillarsOpen} onOpenChange={setPillarsOpen} />
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </>
  )
}
