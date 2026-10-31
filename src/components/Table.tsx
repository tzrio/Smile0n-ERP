import type { ReactNode } from 'react'

type Props = {
  headers: string[]
  children: ReactNode
  className?: string
}

export function Table({ headers, children, className }: Props) {
  return (
    <div
      className={[
        'overflow-x-auto rounded-xl border border-slate-200/90 bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:border-slate-800/80 dark:bg-[#0f172a]/60 dark:shadow-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <table className="min-w-full divide-y divide-slate-200/80 text-left text-sm dark:divide-slate-800/80">
        <thead className="bg-slate-50/80 dark:bg-slate-900/40">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="px-4 py-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-transparent text-slate-700 dark:divide-slate-800/50 dark:text-slate-300">
          {children}
        </tbody>
      </table>
    </div>
  )
}
