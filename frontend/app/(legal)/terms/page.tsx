'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="BravoPoultry"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
            />
            <span className="text-xl font-bold text-gray-900">BravoPoultry</span>
          </Link>
          <Link
            href="/register"
            className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conditions Generales d'Utilisation</h1>
        <p className="text-gray-500 mb-8">Derniere mise a jour : 31 janvier 2026</p>

        <div className="bg-white rounded-xl border p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptation des conditions</h2>
            <p className="text-gray-600 leading-relaxed">
              En accedant et en utilisant la plateforme BravoPoultry, vous acceptez d'etre lie par les
              presentes Conditions Generales d'Utilisation. Si vous n'acceptez pas ces conditions,
              veuillez ne pas utiliser notre service.
            </p>
          </section>

          {/* Description du service */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description du service</h2>
            <p className="text-gray-600 mb-4">
              BravoPoultry est une plateforme de gestion avicole en ligne (SaaS) qui permet aux
              eleveurs de :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Gerer leurs bandes de volailles (pondeuses, poulets de chair)</li>
              <li>Suivre la production, l'alimentation et la sante</li>
              <li>Gerer les ventes et les finances</li>
              <li>Analyser les performances de leur exploitation</li>
              <li>Collaborer avec leur equipe</li>
            </ul>
          </section>

          {/* Inscription */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Inscription et compte</h2>
            <p className="text-gray-600 mb-4">Pour utiliser BravoPoultry, vous devez :</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Avoir au moins 18 ans ou avoir l'autorisation d'un tuteur legal</li>
              <li>Fournir des informations exactes et a jour</li>
              <li>Maintenir la confidentialite de vos identifiants de connexion</li>
              <li>Nous informer immediatement de toute utilisation non autorisee</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Vous etes responsable de toutes les activites effectuees sous votre compte.
            </p>
          </section>

          {/* Utilisation acceptable */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Utilisation acceptable</h2>
            <p className="text-gray-600 mb-4">Vous vous engagez a ne pas :</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Utiliser le service a des fins illegales ou non autorisees</li>
              <li>Tenter d'acceder aux comptes d'autres utilisateurs</li>
              <li>Interferer avec le fonctionnement de la plateforme</li>
              <li>Transmettre des virus ou codes malveillants</li>
              <li>Collecter des donnees d'autres utilisateurs sans autorisation</li>
              <li>Revendre ou redistribuer le service sans autorisation</li>
            </ul>
          </section>

          {/* Propriete intellectuelle */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Propriete intellectuelle</h2>
            <p className="text-gray-600 leading-relaxed">
              BravoPoultry et son contenu (logos, textes, graphiques, logiciels) sont proteges par les
              lois sur la propriete intellectuelle. Vous conservez la propriete de vos donnees
              d'exploitation. En utilisant le service, vous nous accordez une licence limitee pour
              traiter vos donnees afin de fournir le service.
            </p>
          </section>

          {/* Tarification */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Tarification et paiement</h2>
            <p className="text-gray-600 mb-4">
              BravoPoultry propose differents plans tarifaires :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Plan Gratuit :</strong> fonctionnalites de base avec limitations</li>
              <li><strong>Plans Payants :</strong> fonctionnalites avancees selon l'abonnement choisi</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Les prix sont indiques en XAF (ou devise locale) et peuvent etre modifies avec un
              preavis de 30 jours. Les abonnements sont renouvelables automatiquement sauf annulation.
            </p>
          </section>

          {/* Disponibilite */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Disponibilite du service</h2>
            <p className="text-gray-600 leading-relaxed">
              Nous nous efforcons de maintenir le service disponible 24h/24. Cependant, nous ne
              garantissons pas une disponibilite ininterrompue. Des maintenances programmees peuvent
              avoir lieu et seront annoncees a l'avance lorsque possible.
            </p>
          </section>

          {/* Limitation de responsabilite */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Limitation de responsabilite</h2>
            <p className="text-gray-600 leading-relaxed">
              BravoPoultry est fourni "tel quel". Nous ne garantissons pas que le service sera exempt
              d'erreurs. En aucun cas, BravoPoultry ne sera responsable des dommages indirects,
              accessoires ou consecutifs resultant de l'utilisation du service. Notre responsabilite
              totale est limitee au montant que vous avez paye pour le service au cours des 12 derniers mois.
            </p>
          </section>

          {/* Donnees et sauvegardes */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Vos donnees</h2>
            <p className="text-gray-600 leading-relaxed">
              Vous etes proprietaire de vos donnees. Nous effectuons des sauvegardes regulieres mais
              vous recommandons d'exporter periodiquement vos donnees importantes. En cas de
              resiliation, vous disposez de 30 jours pour exporter vos donnees avant leur suppression.
            </p>
          </section>

          {/* Resiliation */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Resiliation</h2>
            <p className="text-gray-600 mb-4">
              Vous pouvez resilier votre compte a tout moment depuis les parametres. Nous pouvons
              suspendre ou resilier votre acces en cas de :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Violation des presentes conditions</li>
              <li>Non-paiement des frais d'abonnement</li>
              <li>Activite frauduleuse ou illegale</li>
              <li>Inactivite prolongee du compte (plus de 12 mois)</li>
            </ul>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Modifications des conditions</h2>
            <p className="text-gray-600 leading-relaxed">
              Nous pouvons modifier ces conditions a tout moment. Les modifications importantes vous
              seront notifiees par email au moins 30 jours avant leur entree en vigueur. Votre
              utilisation continue du service apres cette date constitue une acceptation des
              nouvelles conditions.
            </p>
          </section>

          {/* Loi applicable */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Loi applicable</h2>
            <p className="text-gray-600 leading-relaxed">
              Les presentes conditions sont regies par les lois en vigueur au Cameroun. Tout litige
              sera soumis a la competence exclusive des tribunaux de Douala, Cameroun.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              Pour toute question concernant ces conditions d'utilisation :
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700"><strong>BravoPoultry</strong></p>
              <p className="text-gray-600">Email : legal@bravopoultry.com</p>
              <p className="text-gray-600">Support : support@bravopoultry.com</p>
            </div>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-8 flex gap-4 text-sm">
          <Link href="/privacy" className="text-orange-600 hover:text-orange-700">
            Politique de confidentialite
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/register" className="text-orange-600 hover:text-orange-700">
            Creer un compte
          </Link>
        </div>
      </main>
    </div>
  )
}
