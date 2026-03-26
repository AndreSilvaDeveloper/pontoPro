'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileCarouselProps {
  children: React.ReactNode[]
  autoplay?: boolean
  interval?: number
}

export function MobileCarousel({ children, autoplay = true, interval = 3000 }: MobileCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!autoplay) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % children.length)
    }, interval)

    return () => clearInterval(timer)
  }, [autoplay, interval, children.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + children.length) % children.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % children.length)
  }

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {children.map((child, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="mt-4 flex justify-center gap-2">
        {children.map((_, index) => (
          <button
            key={index}
            className={`h-3 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
              index === currentIndex
                ? 'bg-transparent'
                : 'bg-transparent'
            }`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Ir para slide ${index + 1}`}
          >
            <span className={`block h-2 rounded-full transition-all ${
              index === currentIndex ? 'w-8 bg-purple-500' : 'w-2 bg-purple-500/30'
            }`} />
          </button>
        ))}
      </div>
    </div>
  )
}
