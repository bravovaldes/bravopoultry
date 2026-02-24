import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="BravoPoultry"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
            <div>
              <span className="font-semibold text-gray-900">BravoPoultry</span>
              <p className="text-xs text-gray-400">Gestion avicole intelligente</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/login" className="hover:text-gray-900 transition-colors">
              Connexion
            </Link>
            <Link href="/register" className="hover:text-gray-900 transition-colors">
              Inscription
            </Link>
          </div>

          <p className="text-gray-400 text-xs sm:text-sm">
            &copy; {new Date().getFullYear()} BravoPoultry. Tous droits reserves.
          </p>
        </div>
      </div>
    </footer>
  )
}
