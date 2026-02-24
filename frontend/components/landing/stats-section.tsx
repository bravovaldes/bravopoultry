'use client'

import { ScrollReveal } from './scroll-reveal'
import { AnimatedCounter } from './animated-counter'

const stats = [
  { value: 100, prefix: '', suffix: '%', label: 'Gratuit pour commencer' },
  { value: null, display: '24/7', label: 'Acces a vos donnees' },
  { value: 30, prefix: '+', suffix: '%', label: 'Productivite moyenne' },
  { value: null, display: 'IA', label: 'Predictions intelligentes' },
]

export function StatsSection() {
  return (
    <section className="py-12 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-6 sm:p-10 lg:p-16">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-10" aria-hidden>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/20 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl" />
            </div>

            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 text-center">
              {stats.map((stat, index) => (
                <ScrollReveal key={stat.label} delay={index * 100} direction="none">
                  <div>
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-1 sm:mb-2">
                      {stat.value !== null ? (
                        <AnimatedCounter
                          end={stat.value}
                          prefix={stat.prefix}
                          suffix={stat.suffix}
                        />
                      ) : (
                        stat.display
                      )}
                    </div>
                    <div className="text-orange-100 text-xs sm:text-sm lg:text-base">
                      {stat.label}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
