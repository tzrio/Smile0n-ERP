import type { ChartPeriod } from '../domain/selectors'

type Props = {
  value: ChartPeriod
  onChange: (p: ChartPeriod) => void
}

const OPTIONS: { value: ChartPeriod; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200/80 bg-slate-50/60 p-0.5 dark:border-slate-800 dark:bg-slate-900/60">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all',
            value === opt.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
