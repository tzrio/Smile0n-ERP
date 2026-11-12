import { useState, useMemo } from 'react'

export type SortDir = 'asc' | 'desc'

export type SortState = {
  key: string
  dir: SortDir
}

/**
 * Generic sortable table hook.
 * T = row type, Keys = union of sortable column keys.
 *
 * Usage:
 *   const { sortState, toggleSort, sorted } = useSortableTable(rows, {
 *     defaultKey: 'date',
 *     defaultDir: 'desc',
 *     getValue: (row, key) => row[key],
 *   })
 */
export function useSortableTable<T>(
  rows: T[],
  options: {
    defaultKey: string
    defaultDir?: SortDir
    /** Return a sortable primitive for a given column key */
    getValue: (row: T, key: string) => string | number | undefined | null
  }
) {
  const [sortState, setSortState] = useState<SortState>({
    key: options.defaultKey,
    dir: options.defaultDir ?? 'desc',
  })

  function toggleSort(key: string) {
    setSortState((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    )
  }

  const sorted = useMemo(() => {
    const { key, dir } = sortState
    return [...rows].sort((a, b) => {
      const av = options.getValue(a, key) ?? ''
      const bv = options.getValue(b, key) ?? ''
      let cmp = 0
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        cmp = String(av).localeCompare(String(bv), 'id', { numeric: true })
      }
      return dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortState, options])

  return { sortState, toggleSort, sorted }
}
