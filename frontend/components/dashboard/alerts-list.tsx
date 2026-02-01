'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    iconColor: 'text-yellow-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-500',
  },
}

interface AlertsListProps {
  compact?: boolean
}

export function AlertsList({ compact = false }: AlertsListProps) {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await api.get('/dashboard/alerts')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("bg-gray-100 rounded-lg animate-pulse", compact ? "h-12" : "h-16")} />
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className={cn("text-center text-gray-500", compact ? "py-4" : "py-8")}>
        <Info className={cn("mx-auto text-gray-300", compact ? "w-8 h-8 mb-2" : "w-12 h-12 mb-3")} />
        <p className={compact ? "text-sm" : ""}>Aucune alerte active</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert: any) => {
        const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info
        const Icon = config.icon

        return (
          <div
            key={alert.id}
            className={cn('rounded-lg', config.bgColor, compact ? 'p-2.5' : 'p-4')}
          >
            <div className={cn('flex items-start', compact ? 'gap-2' : 'gap-3')}>
              <Icon className={cn('flex-shrink-0', config.iconColor, compact ? 'w-4 h-4 mt-0.5' : 'w-5 h-5 mt-0.5')} />
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium', config.textColor, compact ? 'text-xs' : 'text-sm')}>
                  {alert.title}
                </p>
                {!compact && (
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                )}
                <p className={cn('text-gray-400', compact ? 'text-[10px] mt-0.5' : 'text-xs mt-2')}>
                  {formatDate(alert.created_at)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
