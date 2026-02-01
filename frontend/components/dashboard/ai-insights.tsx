'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  Zap,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Insight {
  type: 'prediction' | 'alert' | 'recommendation' | 'performance'
  priority: 'high' | 'medium' | 'low'
  icon: string
  title: string
  message: string
  value?: string
  trend?: 'up' | 'down' | 'stable'
  action?: {
    label: string
    href: string
  }
  lot_id?: string
  lot_code?: string
}

export function AIInsights() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const response = await api.get('/dashboard/ai-insights')
      return response.data
    },
    refetchInterval: 60000,
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Assistant IA</h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-pulse flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gray-400" />
            <span className="text-gray-500">Analyse en cours...</span>
          </div>
        </div>
      </div>
    )
  }

  const insights: Insight[] = data?.insights || []

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Assistant IA</h2>
        </div>
        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
          <Sparkles className="w-8 h-8 mb-2" />
          <p className="text-sm">Pas assez de donnees</p>
          <p className="text-xs">Continuez a enregistrer vos donnees</p>
        </div>
      </div>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert': return AlertTriangle
      case 'prediction': return Zap
      case 'recommendation': return Lightbulb
      case 'performance': return Target
      default: return Brain
    }
  }

  const getTitleColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-orange-600'
      default: return 'text-gray-900'
    }
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Assistant IA</h2>
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          {insights.length}
        </span>
      </div>

      <div className="space-y-3">
        {insights.slice(0, 4).map((insight, index) => {
          return (
            <div
              key={index}
              className="bg-gray-50 rounded-lg p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn('font-medium text-sm', getTitleColor(insight.priority))}>
                    {insight.title}
                  </p>
                  {insight.lot_code && (
                    <span className="text-xs text-gray-400">
                      {insight.lot_code}
                    </span>
                  )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{insight.message}</p>

                  {insight.value && (
                    <div className="flex items-center gap-1 mt-1">
                      {insight.trend === 'up' && <TrendingUp className="w-3 h-3 text-gray-400" />}
                      {insight.trend === 'down' && <TrendingDown className="w-3 h-3 text-gray-400" />}
                      <span className="text-sm font-semibold text-gray-700">{insight.value}</span>
                    </div>
                  )}

                  {insight.action && (
                    <Link
                      href={insight.action.href}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-2"
                    >
                      {insight.action.label}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
              </div>
            </div>
          )
        })}
      </div>

      {insights.length > 4 && (
        <div className="mt-3 text-center">
          <button className="text-xs text-gray-500 hover:text-gray-700">
            Voir {insights.length - 4} autres
          </button>
        </div>
      )}
    </div>
  )
}
