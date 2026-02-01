import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/logo.png"
              alt="BravoPoultry"
              width={44}
              height={44}
              className="w-9 h-9 sm:w-11 sm:h-11 object-contain"
            />
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">BravoPoultry</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            <Link
              href="/login"
              className="text-sm sm:text-base text-gray-600 hover:text-gray-900 font-medium lg:text-lg"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="bg-orange-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 rounded-lg font-medium text-sm sm:text-base lg:text-lg hover:bg-orange-600 transition"
            >
              <span className="hidden sm:inline">Commencer Gratuitement</span>
              <span className="sm:hidden">S'inscrire</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-24 xl:py-32">
        <div className="text-center max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8 leading-tight">
            Le SaaS Avicole le Plus{' '}
            <span className="text-orange-500">Complet</span> au Monde
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-6 sm:mb-8 lg:mb-12 max-w-3xl mx-auto px-2">
            Gérez vos élevages de poulets de chair et de pondeuses avec une plateforme
            intelligente. Suivi de production, analytics en temps réel, et prédictions IA.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 lg:gap-6 px-4 sm:px-0">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-orange-500 text-white px-6 py-3 sm:px-8 lg:px-10 lg:py-4 rounded-lg font-semibold text-base sm:text-lg lg:text-xl hover:bg-orange-600 transition"
            >
              Démarrer Gratuitement
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto border border-gray-300 text-gray-700 px-6 py-3 sm:px-8 lg:px-10 lg:py-4 rounded-lg font-semibold text-base sm:text-lg lg:text-xl hover:border-gray-400 transition"
            >
              Voir les Fonctionnalités
            </Link>
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mt-16 sm:mt-24 lg:mt-40">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 lg:mb-16">
            Tout ce dont vous avez besoin
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-5 sm:p-6 lg:p-8 shadow-sm border hover:shadow-md transition"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-orange-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                  <span className="text-xl sm:text-2xl lg:text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-1.5 sm:mb-2">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 lg:text-lg">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mt-16 sm:mt-24 lg:mt-40 bg-orange-500 rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-16 text-white">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 lg:gap-12 text-center">
            <div>
              <div className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-1 sm:mb-2">100%</div>
              <div className="text-orange-100 text-xs sm:text-sm lg:text-lg">Gratuit pour commencer</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-1 sm:mb-2">24/7</div>
              <div className="text-orange-100 text-xs sm:text-sm lg:text-lg">Accès à vos données</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-1 sm:mb-2">+30%</div>
              <div className="text-orange-100 text-xs sm:text-sm lg:text-lg">Productivité moyenne</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-1 sm:mb-2">IA</div>
              <div className="text-orange-100 text-xs sm:text-sm lg:text-lg">Prédictions intelligentes</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-8 sm:mt-12 lg:mt-20 border-t">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/logo.png"
              alt="BravoPoultry"
              width={32}
              height={32}
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
            <span className="font-semibold text-gray-900 text-sm sm:text-base">BravoPoultry</span>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm text-center">
            &copy; {new Date().getFullYear()} BravoPoultry. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: '🐔',
    title: 'Gestion des Bandes',
    description:
      'Suivez vos bandes de poulets de chair et pondeuses avec des métriques détaillées.',
  },
  {
    icon: '🥚',
    title: 'Production Journalière',
    description:
      'Enregistrez la production d\'œufs, les pesées, et la mortalité en quelques clics.',
  },
  {
    icon: '📊',
    title: 'Analytics Avancés',
    description:
      'Tableaux de bord interactifs avec graphiques et KPIs en temps réel.',
  },
  {
    icon: '🤖',
    title: 'Intelligence Artificielle',
    description:
      'Prédictions de production, détection d\'anomalies et recommandations.',
  },
  {
    icon: '💰',
    title: 'Gestion Financière',
    description:
      'Suivi des ventes, dépenses, et calcul automatique de la rentabilité.',
  },
  {
    icon: '💉',
    title: 'Santé & Vaccination',
    description:
      'Calendrier vaccinal, rappels automatiques et suivi des traitements.',
  },
]
