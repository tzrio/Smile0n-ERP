import type { ReactNode } from 'react'

type Props = {
  title?: string
  description?: string
  children: ReactNode
  right?: ReactNode
  className?: string
}

export function Card({ title, description, right, children, className }: Props) {
  return (
    <section
      className={[
        'rounded-xl border border-slate-200/90 bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] backdrop-blur-xs transition-shadow duration-150',
        'dark:border-slate-800/80 dark:bg-[#0f172a]/70 dark:shadow-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(title || description || right) && (
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800/70">
          <div>
            {title && (
              <h2 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}
