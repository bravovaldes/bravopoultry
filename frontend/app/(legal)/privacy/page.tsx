'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Politique de Confidentialite</h1>
        <p className="text-gray-500 mb-8">Derniere mise a jour : 31 janvier 2026</p>

        <div className="bg-white rounded-xl border p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              BravoPoultry ("nous", "notre", "nos") s'engage a proteger la vie privee de ses utilisateurs.
              Cette politique de confidentialite explique comment nous collectons, utilisons, stockons et
              protegeons vos informations personnelles lorsque vous utilisez notre plateforme de gestion avicole.
            </p>
          </section>

          {/* Donnees collectees */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Donnees que nous collectons</h2>
            <p className="text-gray-600 mb-4">Nous collectons les types de donnees suivants :</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Informations d'identification :</strong> nom, prenom, adresse email, numero de telephone</li>
              <li><strong>Informations d'exploitation :</strong> nom de l'exploitation, adresse, donnees de production</li>
              <li><strong>Donnees de production :</strong> informations sur vos lots, production d'oeufs, mortalite, alimentation</li>
              <li><strong>Donnees financieres :</strong> ventes, depenses, factures (sans informations bancaires)</li>
              <li><strong>Donnees techniques :</strong> adresse IP, type de navigateur, pages visitees</li>
            </ul>
          </section>

          {/* Utilisation des donnees */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Comment nous utilisons vos donnees</h2>
            <p className="text-gray-600 mb-4">Vos donnees sont utilisees pour :</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Fournir et ameliorer nos services de gestion avicole</li>
              <li>Generer des analyses et rapports pour votre exploitation</li>
              <li>Vous envoyer des notifications importantes (alertes, rappels)</li>
              <li>Assurer la securite de votre compte</li>
              <li>Repondre a vos demandes de support</li>
              <li>Ameliorer nos algorithmes de prediction (donnees anonymisees)</li>
            </ul>
          </section>

          {/* Partage des donnees */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Partage de vos donnees</h2>
            <p className="text-gray-600 mb-4">
              Nous ne vendons jamais vos donnees personnelles. Nous pouvons partager vos informations avec :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Membres de votre equipe :</strong> selon les permissions que vous definissez</li>
              <li><strong>Prestataires techniques :</strong> hebergement, emails (avec accords de confidentialite)</li>
              <li><strong>Autorites legales :</strong> si requis par la loi</li>
            </ul>
          </section>

          {/* Securite */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Securite des donnees</h2>
            <p className="text-gray-600 leading-relaxed">
              Nous mettons en oeuvre des mesures de securite appropriees pour proteger vos donnees :
              chiffrement des donnees en transit (HTTPS), mots de passe hashes, acces restreint aux donnees,
              sauvegardes regulieres. Cependant, aucune methode de transmission sur Internet n'est
              totalement securisee.
            </p>
          </section>

          {/* Conservation */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Conservation des donnees</h2>
            <p className="text-gray-600 leading-relaxed">
              Nous conservons vos donnees aussi longtemps que votre compte est actif ou que necessaire
              pour vous fournir nos services. Vous pouvez demander la suppression de votre compte et
              de vos donnees a tout moment en nous contactant.
            </p>
          </section>

          {/* Droits */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Vos droits</h2>
            <p className="text-gray-600 mb-4">Vous disposez des droits suivants concernant vos donnees :</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Acces :</strong> obtenir une copie de vos donnees personnelles</li>
              <li><strong>Rectification :</strong> corriger des donnees inexactes</li>
              <li><strong>Suppression :</strong> demander la suppression de vos donnees</li>
              <li><strong>Portabilite :</strong> recevoir vos donnees dans un format lisible</li>
              <li><strong>Opposition :</strong> vous opposer a certains traitements</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Pour exercer ces droits, contactez-nous a : <strong>privacy@bravopoultry.com</strong>
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Nous utilisons des cookies essentiels pour le fonctionnement de la plateforme
              (authentification, preferences). Nous n'utilisons pas de cookies publicitaires
              ou de tracking tiers.
            </p>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Modifications</h2>
            <p className="text-gray-600 leading-relaxed">
              Nous pouvons mettre a jour cette politique periodiquement. Les modifications importantes
              vous seront notifiees par email. La date de derniere mise a jour est indiquee en haut
              de cette page.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              Pour toute question concernant cette politique de confidentialite, contactez-nous :
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700"><strong>BravoPoultry</strong></p>
              <p className="text-gray-600">Email : privacy@bravopoultry.com</p>
              <p className="text-gray-600">Support : support@bravopoultry.com</p>
            </div>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-8 flex gap-4 text-sm">
          <Link href="/terms" className="text-orange-600 hover:text-orange-700">
            Conditions d'utilisation
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
