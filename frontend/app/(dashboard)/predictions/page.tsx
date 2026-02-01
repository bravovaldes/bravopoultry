'use client'

import { useState } from 'react'
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Zap,
  Activity,
  DollarSign,
  Mic,
  Camera,
  Bell,
  BarChart3,
  MessageSquare,
  Cloud,
  Sparkles,
  Lock,
  Mail,
  Phone,
  Clock,
  Scale,
  Target,
  LineChart,
  Users,
  Cpu,
  Rocket,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// AI Features - Solutions avancees (prioritaires)
const ADVANCED_FEATURES = [
  {
    id: 'audio-analysis',
    icon: Mic,
    title: 'Analyse audio des poulets',
    description: 'Detection precoce des maladies respiratoires et du stress par analyse des sons. Identifie les problemes AVANT les symptomes visibles.',
    highlight: 'Innovation mondiale',
  },
  {
    id: 'vision-camera',
    icon: Camera,
    title: 'Vision par camera',
    description: 'Comptage automatique des oiseaux, detection des comportements anormaux, analyse de la posture pour detecter la boiterie.',
    highlight: 'Computer Vision',
  },
  {
    id: 'market-prediction',
    icon: LineChart,
    title: 'Prediction de prix marche',
    description: 'Analyse des tendances du marche local pour recommander le meilleur moment de vente. Integration des fetes et saisons.',
    highlight: 'Market Intelligence',
  },
  {
    id: 'weather-impact',
    icon: Cloud,
    title: 'Impact meteo → Production',
    description: 'Correlation automatique entre les previsions meteo et l\'impact sur vos lots. Recommandations proactives.',
    highlight: 'Meteo + IA',
  },
  {
    id: 'voice-assistant',
    icon: MessageSquare,
    title: 'Assistant vocal terrain',
    description: 'Parlez a l\'app: "Enregistre 5 mortalites batiment B". Ideal pour les eleveurs sur le terrain.',
    highlight: 'Commande vocale',
  },
  {
    id: 'digital-twin',
    icon: Cpu,
    title: 'Jumeau numerique',
    description: 'Simulation: "Si je change d\'aliment, quel impact?" Testez vos decisions avant de les prendre.',
    highlight: 'Simulation',
  },
  {
    id: 'benchmark',
    icon: Users,
    title: 'Benchmark anonyme',
    description: 'Comparez vos performances vs autres eleveurs (anonymises). Apprenez des meilleurs.',
    highlight: 'Intelligence collective',
  },
  {
    id: 'why-analysis',
    icon: Lightbulb,
    title: 'IA explicative "Pourquoi?"',
    description: 'L\'IA explique les causes probables basees sur VOS donnees et recommande des actions concretes.',
    highlight: 'IA comprehensible',
  },
]

// Fonctionnalites bientot disponibles
const COMING_SOON_FEATURES = [
  {
    id: 'mortality-prediction',
    icon: Activity,
    title: 'Prediction de mortalite',
    description: 'Anticipez les risques bases sur vos donnees historiques et les conditions environnementales.',
  },
  {
    id: 'growth-forecast',
    icon: Scale,
    title: 'Prevision de croissance',
    description: 'Courbes de croissance predites avec alertes si le lot devie de la trajectoire optimale.',
  },
  {
    id: 'feed-optimization',
    icon: Zap,
    title: 'Optimisation alimentaire',
    description: 'Recommandations pour optimiser l\'indice de consommation et reduire le gaspillage.',
  },
  {
    id: 'profitability-forecast',
    icon: DollarSign,
    title: 'Prevision de rentabilite',
    description: 'Estimez le profit final avec des scenarios optimiste, realiste et pessimiste.',
  },
  {
    id: 'anomaly-detection',
    icon: Bell,
    title: 'Detection d\'anomalies',
    description: 'Alertes instantanees sur tout ecart inhabituel dans vos donnees.',
  },
  {
    id: 'health-score',
    icon: Target,
    title: 'Score de sante global',
    description: 'Un score unique combinant tous les indicateurs de sante de vos lots.',
  },
]

export default function PredictionsPage() {
  const [activeTab, setActiveTab] = useState<'advanced' | 'coming-soon'>('advanced')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-7 h-7 text-orange-600" />
          Predictions IA
        </h1>
        <p className="text-gray-500">Intelligence artificielle pour optimiser votre elevage</p>
      </div>

      {/* Main Banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-xl">
            <Sparkles className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Solutions IA en developpement
              </h2>
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                Bientot
              </span>
            </div>
            <p className="text-gray-600">
              Nous developpons des solutions d'intelligence artificielle pour transformer votre elevage.
              Ces fonctionnalites utiliseront VOS donnees pour des predictions personnalisees et precises.
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                <span>Base sur vos donnees</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span>Amelioration continue</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Rocket className="w-4 h-4 text-orange-500" />
                <span>Technologies de pointe</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('advanced')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition",
            activeTab === 'advanced'
              ? "bg-white shadow text-orange-600"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Zap className="w-4 h-4 inline mr-2" />
          Solutions avancees
        </button>
        <button
          onClick={() => setActiveTab('coming-soon')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition",
            activeTab === 'coming-soon'
              ? "bg-white shadow text-orange-600"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Bientot disponible
        </button>
      </div>

      {/* Advanced Features */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Lock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Solutions sur mesure</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Ces fonctionnalites necessitent une implementation personnalisee. Contactez-nous pour en discuter.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <a
                  href="mailto:contact@bravopoultry.com"
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                >
                  <Mail className="w-4 h-4" />
                  contact@bravopoultry.com
                </a>
                <a
                  href="https://wa.me/14184901849"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  <Phone className="w-4 h-4" />
                  +1 418-490-1849
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ADVANCED_FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.id}
                  className="bg-white rounded-xl border p-5 hover:border-orange-200 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 bg-gray-100 rounded-xl">
                      <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-600 rounded-full font-medium">
                      {feature.highlight}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>

        </div>
      )}

      {/* Coming Soon Features */}
      {activeTab === 'coming-soon' && (
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">En cours de developpement</p>
                <p className="text-sm text-gray-600 mt-1">
                  Ces fonctionnalites seront automatiquement activees pour votre compte.
                  Elles utiliseront vos donnees existantes pour generer des predictions personnalisees.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {COMING_SOON_FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.id}
                  className="bg-white rounded-xl border p-5 hover:border-orange-200 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 bg-gray-100 rounded-xl">
                      <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full font-medium">
                      En dev
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>

                  <div className="mt-4 pt-3 border-t flex items-center gap-2 text-xs text-gray-500">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Utilise vos donnees</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Note */}
          <div className="bg-gray-50 border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-700">Comment ca fonctionne ?</p>
                <p className="text-sm text-gray-600 mt-1">
                  Plus vous enregistrez de donnees dans BravoPoultry, plus les predictions seront precises.
                  Nos algorithmes analysent continuellement vos donnees pour identifier des patterns
                  et generer des recommandations personnalisees.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
