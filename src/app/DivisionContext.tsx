import React, { createContext, useContext, useState, useEffect } from 'react'
import type { BusinessDivision } from '../data/types'

export type DivisionFilter = 'ALL' | BusinessDivision

interface DivisionContextType {
  division: DivisionFilter
  setDivision: (div: DivisionFilter) => void
}

const DivisionContext = createContext<DivisionContextType | undefined>(undefined)

const STORAGE_KEY = 'smileon.division.filter'

export function DivisionProvider({ children }: { children: React.ReactNode }) {
  const [division, setDivisionState] = useState<DivisionFilter>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'WALL_DECOR' || saved === 'FOOD' || saved === 'ALL') return saved
      return 'ALL'
    } catch {
      return 'ALL'
    }
  })

  const setDivision = (div: DivisionFilter) => {
    setDivisionState(div)
    try {
      localStorage.setItem(STORAGE_KEY, div)
    } catch {
      // ignore
    }
  }

  return (
    <DivisionContext.Provider value={{ division, setDivision }}>
      {children}
    </DivisionContext.Provider>
  )
}

export function useDivision() {
  const ctx = useContext(DivisionContext)
  if (!ctx) throw new Error('useDivision must be used within DivisionProvider')
  return ctx
}
