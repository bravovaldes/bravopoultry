'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

const VIDEO_ID = 'GsxR-P01DfQ'

export function VideoSection() {
  const [showVideo, setShowVideo] = useState(false)

  return (
    <section className="py-12 sm:py-20 lg:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-3 sm:mb-4">
            Decouvrez BravoPoultry en Action
          </h2>
          <p className="text-center text-gray-500 mb-8 sm:mb-10 max-w-2xl mx-auto text-sm sm:text-base lg:text-lg">
            Regardez comment notre plateforme simplifie la gestion de votre elevage au quotidien.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-900/10 border border-gray-200/50 bg-gray-900">
            {showVideo ? (
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
                  title="Presentation BravoPoultry"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            ) : (
              <button
                onClick={() => setShowVideo(true)}
                className="relative aspect-video w-full group cursor-pointer"
              >
                {/* YouTube thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
                  alt="Video de presentation BravoPoultry"
                  className="w-full h-full object-cover"
                />

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/40 group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-7 h-7 sm:w-9 sm:h-9 text-white ml-1" fill="white" />
                  </div>
                </div>

                {/* Label */}
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                  <span className="bg-white/90 backdrop-blur-sm text-gray-900 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg">
                    Voir la presentation
                  </span>
                </div>
              </button>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
