import './chartSetup'
import { Bar } from 'react-chartjs-2'
import { useTheme } from '../../app/ThemeContext'

/**
 * Theme-aware bar chart wrapper for monthly analytics.
 * Palette: Muted subtle bars, ergonomic contrast.
 */

type Props = {
  months: string[]
  label: string
  data: number[]
}

export function MonthlyBarChart({ months, label, data }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const hasData = data.some((n) => Number.isFinite(n) && n !== 0)

  if (!months.length || !data.length || !hasData) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl bg-slate-50/50 text-xs text-slate-500 border border-slate-200/70 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800 lg:h-64">
        Belum ada mutasi barang pada periode ini.
      </div>
    )
  }

  const chartData = {
    labels: months,
    datasets: [
      {
        label,
        data,
        backgroundColor: data.map((v) =>
          v >= 0
            ? isDark
              ? 'rgba(56, 189, 248, 0.25)'
              : 'rgba(2, 132, 199, 0.2)'
            : isDark
            ? 'rgba(244, 63, 94, 0.25)'
            : 'rgba(225, 29, 72, 0.2)'
        ),
        borderColor: data.map((v) =>
          v >= 0
            ? isDark
              ? '#38bdf8'
              : '#0284c7'
            : isDark
            ? '#f43f5e'
            : '#e11d48'
        ),
        borderWidth: 1.5,
        borderRadius: 4,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
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
      <Bar data={chartData} options={options} />
    </div>
  )
}
