'use client'

import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SuccessScreenProps {
  title?: string
  subtitle?: string
  className?: string
}

export function SuccessScreen({
  title = 'Enregistré avec succès!',
  subtitle = 'Redirection...',
  className,
}: SuccessScreenProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-64 gap-4', className)}>
      {/* Animated circle */}
      <div className="relative">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
          <CheckCircle className="w-10 h-10 text-green-500 animate-[fade-in_0.3s_ease-out_0.2s_both]" />
        </div>
        {/* Pulse ring */}
        <div className="absolute inset-0 w-20 h-20 bg-green-200 rounded-full animate-ping opacity-20" />
      </div>

      {/* Text */}
      <div className="text-center animate-[fade-in_0.3s_ease-out_0.3s_both]">
        <p className="text-lg font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full animate-[progress_1s_ease-out]" />
      </div>
    </div>
  )
}
