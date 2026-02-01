'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HelpTooltipProps {
  title: string
  content: string
  example?: string
  className?: string
}

export function HelpTooltip({ title, content, example, className }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-400 hover:text-orange-500 transition rounded-full hover:bg-orange-50"
        aria-label="Aide"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* Overlay pour fermer en cliquant ailleurs */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Popup d'aide */}
          <div className="absolute z-50 left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border p-4 text-left">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{title}</h4>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{content}</p>
            {example && (
              <div className="mt-3 p-2 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-700">
                  <span className="font-medium">Exemple:</span> {example}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Version inline pour les labels de formulaire
export function HelpLabel({
  label,
  helpTitle,
  helpContent,
  helpExample,
  required = false
}: {
  label: string
  helpTitle: string
  helpContent: string
  helpExample?: string
  required?: boolean
}) {
  return (
    <div className="flex items-center gap-1 mb-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <HelpTooltip
        title={helpTitle}
        content={helpContent}
        example={helpExample}
      />
    </div>
  )
}
