import type { ReactNode } from 'react'
import type { SortState } from '../hooks/useSortableTable'

export type TableHeader =
  | string
  | {
      label: string
      /** If provided, clicking the header will sort by this key */
      sortKey?: string
    }

type Props = {
  headers: TableHeader[]
  children: ReactNode
  className?: string
  sortState?: SortState
  onSort?: (key: string) => void
}

export function Table({ headers, children, className, sortState, onSort }: Props) {
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
            {headers.map((h, i) => {
              const label = typeof h === 'string' ? h : h.label
              const sortKey = typeof h === 'string' ? undefined : h.sortKey
              const isSorted = sortKey && sortState?.key === sortKey
              const sortable = Boolean(sortKey && onSort)

              return (
                <th
                  key={i}
                  scope="col"
                  onClick={sortable ? () => onSort!(sortKey!) : undefined}
                  className={[
                    'px-4 py-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400 select-none',
                    sortable ? 'cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {sortable && (
                      <span className="text-[10px] opacity-50">
                        {isSorted
                          ? sortState!.dir === 'asc'
                            ? '▲'
                            : '▼'
                          : '⇅'}
                      </span>
                    )}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-transparent text-slate-700 dark:divide-slate-800/50 dark:text-slate-300">
          {children}
        </tbody>
      </table>
    </div>
  )
}
