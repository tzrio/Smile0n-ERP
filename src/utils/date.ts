export function isoNow() {
  return new Date().toISOString()
}

export function toMonthKey(isoDate: string) {
  const d = new Date(isoDate)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  return `${y}-${m}`
}

export function toDateKey(isoDate: string) {
  return new Date(isoDate).toISOString().slice(0, 10)
}

export function toYearKey(isoDate: string) {
  return String(new Date(isoDate).getFullYear())
}

/**
 * Returns ISO week key: YYYY-Www (e.g. "2026-W45")
 * Uses ISO 8601 week numbering (Mon–Sun, week containing first Thursday).
 */
export function toWeekKey(isoDate: string): string {
  const d = new Date(isoDate)
  // Copy date, set to nearest Thursday (ISO week pivots on Thursday)
  const tmp = new Date(d)
  tmp.setHours(0, 0, 0, 0)
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7))
  const year = tmp.getFullYear()
  // Week 1 is the week containing the first Thursday of the year
  const week1 = new Date(year, 0, 4)
  const weekNum = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

export function formatDate(isoDate: string) {
  const d = new Date(isoDate)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Format label sumbu-x grafik per periode */
export function formatPeriodLabel(key: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  if (period === 'yearly') return key
  if (period === 'monthly') {
    const [y, m] = key.split('-')
    const date = new Date(Number(y), Number(m) - 1, 1)
    return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
  }
  if (period === 'weekly') {
    // key = "YYYY-Www" — show "W45 '26"
    const parts = key.split('-W')
    return `W${parts[1]} '${parts[0].slice(2)}`
  }
  if (period === 'daily') {
    // key = "YYYY-MM-DD"
    const d = new Date(key + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }
  return key
}
