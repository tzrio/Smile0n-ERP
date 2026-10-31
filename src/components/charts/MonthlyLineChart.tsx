import './chartSetup'
import { Line } from 'react-chartjs-2'
import { useTheme } from '../../app/ThemeContext'

/**
 * Theme-aware line chart wrapper for monthly analytics.
 * Palette: Muted professional slate & teal/emerald tones.
 */

type Series = {
  label: string
  data: number[]
}

type Props = {
  months: string[]
  series: Series[]
}

export function MonthlyLineChart({ months, series }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const hasData = series.some((s) => s.data.some((n) => Number.isFinite(n) && n !== 0))

  if (!months.length || !series.length || !hasData) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl bg-slate-50/50 text-xs text-slate-500 border border-slate-200/70 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800 lg:h-64">
        Belum ada transaksi pada periode ini.
      </div>
    )
  }

  // Refined enterprise palette (Slate/Zinc & Soft Emerald, no flashy neon)
  const palette = [
    { border: isDark ? '#38bdf8' : '#0284c7', bg: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.06)' },
    { border: isDark ? '#34d399' : '#059669', bg: isDark ? 'rgba(52, 211, 153, 0.08)' : 'rgba(5, 150, 105, 0.06)' },
    { border: isDark ? '#fbbf24' : '#d97706', bg: isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(217, 119, 6, 0.06)' },
  ]

  const data = {
    labels: months,
    datasets: series.map((s, idx) => {
      const colors = palette[idx % palette.length]
      return {
        label: s.label,
        data: s.data,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        borderWidth: 2,
        pointRadius: 2.5,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.25,
      }
    }),
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          color: isDark ? '#94a3b8' : '#64748b',
          font: { size: 11, family: 'monospace' },
        },
      },
      title: { display: false },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          color: isDark ? '#64748b' : '#94a3b8',
          font: { size: 10, family: 'monospace' },
        },
      },
      y: {
        ticks: {
          precision: 0,
          color: isDark ? '#64748b' : '#94a3b8',
          font: { size: 10, family: 'monospace' },
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
        },
      },
    },
  }

  return (
    <div className="h-52 lg:h-64">
      <Line data={data} options={options} />
    </div>
  )
}
