'use client'

import Link from 'next/link'
import { ArrowRight, Shield } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

export function CTASection() {
  return (
    <section className="py-12 sm:py-20 lg:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            Pret a transformer votre elevage ?
          </h2>
          <p className="text-gray-500 text-base sm:text-lg lg:text-xl mb-8 sm:mb-10 max-w-2xl mx-auto">
            Rejoignez les aviculteurs qui utilisent BravoPoultry pour optimiser leur production
            et augmenter leur rentabilite.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 sm:px-10 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-orange-600 transition-all hover:shadow-xl hover:shadow-orange-500/25 hover:-translate-y-0.5 group"
          >
            Commencer Gratuitement
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <div className="flex items-center justify-center gap-2 mt-5 text-sm text-gray-400">
            <Shield className="w-4 h-4" />
            <span>Inscription gratuite, sans engagement</span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
