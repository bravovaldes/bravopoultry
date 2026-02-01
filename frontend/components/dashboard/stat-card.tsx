'use client'

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: number
  trendLabel?: string
  icon: LucideIcon
  color?: 'blue' | 'green' | 'orange' | 'red' | 'gray'
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-gray-50 text-gray-600',
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon: Icon,
  color = 'blue',
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border p-3">
      <div className="flex items-center gap-2">
        <div className={cn('p-2 rounded-lg flex-shrink-0', colorClasses[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-gray-500 font-medium leading-tight">{title}</p>
          <p className="text-base font-bold text-gray-900 leading-tight">{value}</p>
        </div>
      </div>
      {(subtitle || trend !== undefined) && (
        <div className="mt-1.5 pl-10">
          {subtitle && (
            <p className="text-[10px] text-gray-500">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500 flex-shrink-0" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500 flex-shrink-0" />
              )}
              <span
                className={cn(
                  'text-[10px] font-medium',
                  trend >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend >= 0 ? '+' : ''}{trend}
              </span>
              {trendLabel && (
                <span className="text-[10px] text-gray-500">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
