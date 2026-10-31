import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={[
        'w-full rounded-lg border border-slate-200/90 bg-white/90 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs transition-colors duration-150',
        'focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5',
        'dark:border-slate-800 dark:bg-[#0b1329] dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-slate-600 dark:focus:ring-white/5',
        'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800/40',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
