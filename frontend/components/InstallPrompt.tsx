'use client'

import { useState, useEffect } from 'react'
import { Download, Share, Plus, X } from 'lucide-react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DAYS = 7

function isDismissed(): boolean {
  if (typeof window === 'undefined') return true
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const dismissed = Number(raw)
  return Date.now() - dismissed < DISMISS_DAYS * 24 * 60 * 60 * 1000
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || isDismissed()) return

    if (isIOS()) {
      setShowIOS(true)
      setVisible(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" onClick={handleDismiss} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 shadow-lg">
          <Image
            src="/logo.png"
            alt="BravoPoultry"
            width={36}
            height={36}
            className="w-9 h-9 object-contain"
          />
        </div>

        <h3 className="text-center text-lg font-bold text-gray-900">
          Installer BravoPoultry
        </h3>
        <p className="mt-1 text-center text-sm text-gray-500">
          Accedez rapidement a votre ferme depuis l&apos;ecran d&apos;accueil, comme une application native.
        </p>

        {showIOS ? (
          /* iOS instructions */
          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Share size={16} />
                </div>
                <p className="text-sm text-gray-700">
                  Appuyez sur le bouton <strong>Partager</strong> en bas de Safari
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Plus size={16} />
                </div>
                <p className="text-sm text-gray-700">
                  Puis <strong>Sur l&apos;ecran d&apos;accueil</strong>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Android / Chrome install button */
          <button
            onClick={handleInstall}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 active:bg-orange-700"
          >
            <Download size={18} />
            Installer
          </button>
        )}

        <button
          onClick={handleDismiss}
          className="mt-2 w-full py-2.5 text-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
