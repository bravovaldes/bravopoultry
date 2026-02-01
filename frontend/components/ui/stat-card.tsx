'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-indigo-600',
  iconBg = 'bg-indigo-100',
  trend,
  className,
}: StatCardProps) {
  return (
    <div className={cn("bg-white p-3 sm:p-4 rounded-xl border", className)}>
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
          <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", iconColor)} />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-xs sm:text-sm text-gray-500 truncate">{title}</p>
          <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate" title={String(value)}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
        </div>
        {trend && (
          <div className={cn(
            "text-xs font-medium px-2 py-1 rounded-full flex-shrink-0",
            trend.positive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {trend.positive ? '+' : ''}{trend.value}% {trend.label}
          </div>
        )}
      </div>
    </div>
  )
}

interface StatCardGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5
}

export function StatCardGrid({ children, columns = 4 }: StatCardGridProps) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  }

  return (
    <div className={cn("grid gap-3 sm:gap-4", colClass[columns])}>
      {children}
    </div>
  )
}
