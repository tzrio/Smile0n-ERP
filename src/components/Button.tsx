import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const base =
  'inline-flex items-center justify-center font-medium transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none'

const sizes = {
  sm: 'rounded-lg px-2.5 py-1.5 text-xs gap-1.5',
  md: 'rounded-lg px-3.5 py-2 text-sm gap-2',
  lg: 'rounded-xl px-4 py-2.5 text-base gap-2.5',
}

const variants: Record<NonNullable<Props['variant']>, string> = {
  primary:
    'bg-slate-800 text-slate-50 shadow-2xs hover:bg-slate-700 active:bg-slate-900 focus-visible:ring-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white dark:active:bg-slate-300 dark:focus-visible:ring-slate-200',
  secondary:
    'border border-slate-200/90 bg-white/90 text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 focus-visible:ring-slate-300 dark:border-slate-800 dark:bg-[#0f172a]/70 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-100',
  danger:
    'bg-rose-600/90 text-white shadow-2xs hover:bg-rose-600 active:bg-rose-700 focus-visible:ring-rose-500 dark:bg-rose-600/80 dark:hover:bg-rose-600',
  ghost:
    'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: Props) {
  return (
    <button
      className={[base, sizes[size], variants[variant], className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
