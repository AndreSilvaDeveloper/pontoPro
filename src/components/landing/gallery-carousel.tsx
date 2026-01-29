'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Slide = {
  src: string
  alt: string
  title?: string
  subtitle?: string
}

type Props = {
  slides: Slide[]
  autoPlay?: boolean
  intervalMs?: number
}

export function GalleryCarousel({ slides, autoPlay = true, intervalMs = 2000 }: Props) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null)
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const itemRef = React.useRef<HTMLDivElement | null>(null)

  const [paused, setPaused] = React.useState(false)
  const [active, setActive] = React.useState(0)

  const total = slides?.length ?? 0
  const canLoop = total > 1

  // Triplica para loop infinito “sem costura”
  const renderSlides = React.useMemo(() => {
    if (!canLoop) return slides
    return [...slides, ...slides, ...slides]
  }, [slides, canLoop])

  const middleStart = total
  const physicalIndexRef = React.useRef(middleStart)

  const itemSizeRef = React.useRef<number>(0)
  const rafRef = React.useRef<number | null>(null)
  const settlingRef = React.useRef<boolean>(false)

  function getGapPx() {
    const track = trackRef.current
    if (!track) return 24
    const style = getComputedStyle(track)
    const gap = parseFloat(style.columnGap || style.gap || '24')
    return Number.isFinite(gap) ? gap : 24
  }

  function measure() {
    const item = itemRef.current
    if (!item) return
    const w = item.getBoundingClientRect().width
    const gap = getGapPx()
    itemSizeRef.current = w + gap
  }

  function jumpToPhysical(idx: number) {
    const scroller = scrollerRef.current
    if (!scroller) return
    const x = idx * itemSizeRef.current
    scroller.scrollTo({ left: x, behavior: 'auto' })
  }

  function smoothToPhysical(idx: number) {
    const scroller = scrollerRef.current
    if (!scroller) return
    const x = idx * itemSizeRef.current
    scroller.scrollTo({ left: x, behavior: 'smooth' })
  }

  function normalizePhysicalIfNeeded() {
    if (!canLoop) return
    const scroller = scrollerRef.current
    if (!scroller) return

    const size = itemSizeRef.current
    if (!size) return

    const physical = Math.round(scroller.scrollLeft / size)

    // bloco do meio vai de [total .. 2*total - 1]
    const min = total
    const max = 2 * total - 1

    if (physical < min) {
      const newPhysical = physical + total
      physicalIndexRef.current = newPhysical
      jumpToPhysical(newPhysical)
    } else if (physical > max) {
      const newPhysical = physical - total
      physicalIndexRef.current = newPhysical
      jumpToPhysical(newPhysical)
    } else {
      physicalIndexRef.current = physical
    }
  }

  function updateActiveFromScroll() {
    const scroller = scrollerRef.current
    if (!scroller) return
    const size = itemSizeRef.current
    if (!size) return

    const physical = Math.round(scroller.scrollLeft / size)
    const logical = ((physical % total) + total) % total
    setActive(logical)
  }

  function onScroll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      updateActiveFromScroll()
      if (!settlingRef.current) normalizePhysicalIfNeeded()
    })
  }

  function go(delta: number) {
    if (!total) return

    if (!canLoop) {
      const next = Math.max(0, Math.min(total - 1, active + delta))
      setActive(next)
      smoothToPhysical(next)
      return
    }

    settlingRef.current = true
    const target = physicalIndexRef.current + delta
    physicalIndexRef.current = target
    smoothToPhysical(target)

    window.setTimeout(() => {
      settlingRef.current = false
      normalizePhysicalIfNeeded()
      updateActiveFromScroll()
    }, 450)
  }

  function goTo(index: number) {
    if (!total) return
    const delta = index - active
    go(delta)
  }

  // Setup inicial
  React.useEffect(() => {
    if (!total) return

    measure()
    if (canLoop) {
      physicalIndexRef.current = middleStart
      jumpToPhysical(middleStart)
      setActive(0)
    } else {
      setActive(0)
    }

    const handleResize = () => {
      const prevPhysical = physicalIndexRef.current
      measure()
      if (canLoop) jumpToPhysical(prevPhysical)
      else jumpToPhysical(active)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, canLoop])

  // AutoPlay infinito
  React.useEffect(() => {
    if (!autoPlay || paused || !canLoop) return
    const id = window.setInterval(() => go(1), intervalMs)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, paused, intervalMs, canLoop, active])

  if (!total) {
    return (
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/20 to-transparent p-10 text-center text-sm text-gray-400">
        Nenhuma imagem configurada para a galeria.
      </div>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Frame roxo igual o print */}
      <div className="relative overflow-hidden rounded-[36px] border border-purple-500/20 bg-gradient-to-br from-[#120625] via-[#2b0b52] to-[#140b2a] p-6 shadow-2xl shadow-purple-500/20">
        {/* Aura */}
        <div className="pointer-events-none absolute inset-0 bg-purple-600/10 blur-[120px]" />

        {/* Scroller */}
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="
            relative z-10
            overflow-x-auto overflow-y-hidden
            [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden

            /* ✅ Centraliza no mobile sem mexer no tamanho: cria “gutter” lateral */
            px-6 sm:px-0

            /* ✅ Snap melhora centralização e sensação no mobile */
            snap-x snap-mandatory
          "
        >
          <div
            ref={trackRef}
            className="flex gap-6"
            style={{ willChange: 'transform' }}
          >
            {renderSlides.map((s, idx) => {
              const isFirst = idx === 0
              return (
                <div
                  key={`${s.src}-${idx}`}
                  ref={isFirst ? itemRef : undefined}
                  className="
                    relative overflow-hidden rounded-3xl
                    border border-purple-500/20 bg-[#0a0e27]/55 backdrop-blur-sm
                    shadow-lg shadow-black/20
                    shrink-0

                    basis-[80%]
                    sm:basis-[55%]
                    md:basis-[40%]
                    lg:basis-[23%]

                    /* ✅ centraliza o item no snap */
                    snap-center
                  "
                >
                  <div className="relative aspect-[4/5] w-full">
                    <img
                      src={s.src}
                      alt={s.alt}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                    {/* overlay vidro */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />

                    {/* legenda no rodapé (igual o print) */}
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="rounded-2xl bg-black/35 px-4 py-3 backdrop-blur-md ring-1 ring-white/10">
                        <div className="text-base font-extrabold text-white">
                          {s.title ?? 'WorkID'}
                        </div>
                        <div className="text-sm text-white/80">
                          {s.subtitle ?? ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dots */}
        <div className="relative z-10 mt-6 flex justify-center gap-2">
          {slides.map((_, i) => {
            const isActive = i === active
            return (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={[
                  'h-2 w-6 rounded-full transition-all',
                  isActive
                    ? 'bg-purple-400 shadow-[0_0_0_4px_rgba(168,85,247,0.18)]'
                    : 'bg-white/15 hover:bg-white/25',
                ].join(' ')}
                aria-label={`Ir para o slide ${i + 1}`}
              />
            )
          })}
        </div>

        {/* ✅ Setas “pra frente” (visíveis e clicáveis) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="
                absolute left-3 top-1/2 -translate-y-1/2
                z-[50] pointer-events-auto
                rounded-2xl border border-purple-500/25
                bg-[#0a0e27]/80 p-3 text-white backdrop-blur
                hover:border-purple-500/50 hover:bg-[#0a0e27]
                focus:outline-none focus:ring-2 focus:ring-purple-400/30
              "
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => go(1)}
              className="
                absolute right-3 top-1/2 -translate-y-1/2
                z-[50] pointer-events-auto
                rounded-2xl border border-purple-500/25
                bg-[#0a0e27]/80 p-3 text-white backdrop-blur
                hover:border-purple-500/50 hover:bg-[#0a0e27]
                focus:outline-none focus:ring-2 focus:ring-purple-400/30
              "
              aria-label="Próximo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
