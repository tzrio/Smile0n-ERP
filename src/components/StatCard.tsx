import type { ReactNode } from 'react'

type Props = {
  label: string
  value: string
  hint?: string
  trend?: string
  icon?: ReactNode
}

export function StatCard({ label, value, hint, trend, icon }: Props) {
  return (
    <div className="group relative rounded-xl border border-slate-200/90 bg-white/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#0f172a]/70 dark:shadow-none dark:hover:border-slate-700">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {label}
        </span>
        {icon && (
          <span className="text-slate-400 transition-colors group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
        {value}
      </div>
      {(hint || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {hint && <span className="truncate">{hint}</span>}
          {trend && (
            <span className="ml-auto inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
