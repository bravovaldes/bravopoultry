'use client'

import {
  Bird,
  Egg,
  BarChart3,
  Brain,
  Wallet,
  Syringe,
  type LucideIcon,
} from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: Bird,
    title: 'Gestion des Bandes',
    description:
      'Suivez vos bandes de poulets de chair et pondeuses avec des metriques detaillees.',
  },
  {
    icon: Egg,
    title: 'Production Journaliere',
    description:
      "Enregistrez la production d'oeufs, les pesees, et la mortalite en quelques clics.",
  },
  {
    icon: BarChart3,
    title: 'Analytics Avances',
    description:
      'Tableaux de bord interactifs avec graphiques et KPIs en temps reel.',
  },
  {
    icon: Brain,
    title: 'Intelligence Artificielle',
    description:
      "Predictions de production, detection d'anomalies et recommandations.",
  },
  {
    icon: Wallet,
    title: 'Gestion Financiere',
    description:
      'Suivi des ventes, depenses, et calcul automatique de la rentabilite.',
  },
  {
    icon: Syringe,
    title: 'Sante & Vaccination',
    description:
      'Calendrier vaccinal, rappels automatiques et suivi des traitements.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-12 sm:py-20 lg:py-28 bg-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-10 sm:mb-14 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <div className="w-16 h-1 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full mx-auto mb-4" />
            <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base lg:text-lg">
              Une plateforme complete pour gerer chaque aspect de votre elevage avicole.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <ScrollReveal key={feature.title} delay={index * 100}>
              <div className="group bg-white rounded-2xl p-5 sm:p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-orange-200/50 transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-100 to-amber-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-500 lg:text-base leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
