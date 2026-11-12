import type { AppData, Product, StockMovement, Transaction } from '../data/types'
import { toMonthKey, toDateKey, toWeekKey, toYearKey } from '../utils/date'

export type ProductStockRow = {
  product: Product
  stockIn: number
  stockOut: number
  remaining: number
}

export function computeProductStock(data: AppData, options?: { productIds?: Set<string> }): ProductStockRow[] {
  const movementsByProduct = new Map<string, StockMovement[]>()
  for (const m of data.stockMovements) {
    const list = movementsByProduct.get(m.productId) ?? []
    list.push(m)
    movementsByProduct.set(m.productId, list)
  }

  const products = options?.productIds ? data.products.filter((p) => options.productIds!.has(p.id)) : data.products

  return products.map((p) => {
    const list = movementsByProduct.get(p.id) ?? []
    const stockIn = list.filter((m) => m.type === 'IN').reduce((acc, m) => acc + m.quantity, 0)
    const stockOut = list.filter((m) => m.type === 'OUT').reduce((acc, m) => acc + m.quantity, 0)
    return {
      product: p,
      stockIn,
      stockOut,
      remaining: stockIn - stockOut,
    }
  })
}

export type FinanceSummary = {
  totalSales: number
  totalPurchases: number
  profit: number
  cashBalance: number
}

export function computeFinanceSummary(
  data: AppData,
  options?: { productIds?: Set<string> }
): FinanceSummary {
  const transactions = options?.productIds
    ? data.transactions.filter((t) => {
        if (!t.items || t.items.length === 0) return true
        return t.items.some((it) => options.productIds!.has(it.productId))
      })
    : data.transactions

  const totalSales = transactions
    .filter((t) => t.type === 'SALE')
    .reduce((acc, t) => acc + t.amount, 0)
  const totalPurchases = transactions
    .filter((t) => t.type === 'PURCHASE')
    .reduce((acc, t) => acc + t.amount, 0)
  const profit = totalSales - totalPurchases
  const cashBalance = data.settings.cashOpeningBalance + profit
  return { totalSales, totalPurchases, profit, cashBalance }
}

export type MonthlyPoint = {
  month: string
  value: number
}

function lastNMonthKeys(n: number): string[] {
  const keys: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = 0; i < n; i++) {
    const y = d.getFullYear()
    const m = `${d.getMonth() + 1}`.padStart(2, '0')
    keys.unshift(`${y}-${m}`)
    d.setMonth(d.getMonth() - 1)
  }
  return keys
}

function sumByMonth(transactions: Transaction[], monthKeys: string[], predicate: (t: Transaction) => boolean) {
  const totals = new Map<string, number>()
  for (const k of monthKeys) totals.set(k, 0)
  for (const t of transactions) {
    if (!predicate(t)) continue
    const k = toMonthKey(t.date)
    if (!totals.has(k)) continue
    totals.set(k, (totals.get(k) ?? 0) + t.amount)
  }
  return monthKeys.map((k) => ({ month: k, value: totals.get(k) ?? 0 }))
}

export type MonthlyAnalytics = {
  months: string[]
  sales: MonthlyPoint[]
  purchases: MonthlyPoint[]
  profit: MonthlyPoint[]
  stockNet: MonthlyPoint[]
}

export function computeMonthlyAnalytics(
  data: AppData,
  months = 12,
  options?: { productIds?: Set<string> }
): MonthlyAnalytics {
  const monthKeys = lastNMonthKeys(months)

  const relevantTransactions = options?.productIds
    ? data.transactions.filter((t) => {
        if (!t.items || t.items.length === 0) return true
        return t.items.some((it) => options.productIds!.has(it.productId))
      })
    : data.transactions

  const sales = sumByMonth(relevantTransactions, monthKeys, (t) => t.type === 'SALE')
  const purchases = sumByMonth(relevantTransactions, monthKeys, (t) => t.type === 'PURCHASE')
  const profit = monthKeys.map((k) => {
    const s = sales.find((p) => p.month === k)?.value ?? 0
    const b = purchases.find((p) => p.month === k)?.value ?? 0
    return { month: k, value: s - b }
  })

  const stockTotals = new Map<string, number>()
  for (const k of monthKeys) stockTotals.set(k, 0)
  for (const m of data.stockMovements) {
    if (options?.productIds && !options.productIds.has(m.productId)) continue
    const k = toMonthKey(m.date)
    if (!stockTotals.has(k)) continue
    const delta = m.type === 'IN' ? m.quantity : -m.quantity
    stockTotals.set(k, (stockTotals.get(k) ?? 0) + delta)
  }
  const stockNet = monthKeys.map((k) => ({ month: k, value: stockTotals.get(k) ?? 0 }))

  return { months: monthKeys, sales, purchases, profit, stockNet }
}

export type WasteSummary = {
  totalWasteQty: number
  wasteByProduct: { productId: string; productName: string; qty: number }[]
}

/**
 * Hitung total barang basi/terbuang dari mutasi manual dengan movementKind = 'WASTE'
 */
export function computeWasteSummary(data: AppData, options?: { productIds?: Set<string> }): WasteSummary {
  const wasteMovements = data.stockMovements.filter(
    (m) => m.movementKind === 'WASTE' && m.type === 'OUT' && (!options?.productIds || options.productIds.has(m.productId))
  )

  const qtyByProduct = new Map<string, number>()
  for (const m of wasteMovements) {
    qtyByProduct.set(m.productId, (qtyByProduct.get(m.productId) ?? 0) + m.quantity)
  }

  const wasteByProduct = Array.from(qtyByProduct.entries()).map(([productId, qty]) => ({
    productId,
    productName: data.products.find((p) => p.id === productId)?.name ?? productId,
    qty,
  }))

  const totalWasteQty = wasteByProduct.reduce((s, w) => s + w.qty, 0)

  return { totalWasteQty, wasteByProduct }
}

export type DailyFinanceRow = {
  /** ISO date key: YYYY-MM-DD */
  date: string
  sales: number
  purchases: number
  profit: number
  /** Running cumulative cash from opening balance */
  cumulativeCash: number
  /** Individual transactions that day */
  transactions: Transaction[]
}

/**
 * Breakdown laporan keuangan per hari, diurutkan dari terbaru ke terlama.
 * Hanya hari-hari yang memiliki transaksi yang dimunculkan.
 */
export function computeDailyFinance(
  data: AppData,
  options?: { productIds?: Set<string> }
): DailyFinanceRow[] {
  const relevantTransactions = options?.productIds
    ? data.transactions.filter((t) => {
        if (!t.items || t.items.length === 0) return true
        return t.items.some((it) => options.productIds!.has(it.productId))
      })
    : data.transactions

  // Group by date key YYYY-MM-DD
  const byDay = new Map<string, Transaction[]>()
  for (const t of relevantTransactions) {
    const key = t.date.slice(0, 10)
    const list = byDay.get(key) ?? []
    list.push(t)
    byDay.set(key, list)
  }

  // Sort days ascending to compute running cumulative
  const sortedDays = Array.from(byDay.keys()).sort()

  let running = data.settings.cashOpeningBalance
  const rows: DailyFinanceRow[] = sortedDays.map((date) => {
    const txs = byDay.get(date)!
    const sales = txs.filter((t) => t.type === 'SALE').reduce((s, t) => s + t.amount, 0)
    const purchases = txs.filter((t) => t.type === 'PURCHASE').reduce((s, t) => s + t.amount, 0)
    const profit = sales - purchases
    running += profit
    return { date, sales, purchases, profit, cumulativeCash: running, transactions: txs }
  })

  // Return descending (newest first) for display
  return rows.slice().reverse()
}

export type ChartPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type PeriodAnalytics = {
  keys: string[]
  sales: MonthlyPoint[]
  purchases: MonthlyPoint[]
  profit: MonthlyPoint[]
  stockNet: MonthlyPoint[]
}

/** How many periods to show back from now for each granularity */
const PERIOD_COUNT: Record<ChartPeriod, number> = {
  daily: 14,   // last 14 days
  weekly: 8,   // last 8 weeks
  monthly: 12, // last 12 months
  yearly: 5,   // last 5 years
}

function getKeyFn(period: ChartPeriod): (iso: string) => string {
  if (period === 'daily') return toDateKey
  if (period === 'weekly') return toWeekKey
  if (period === 'yearly') return toYearKey
  return toMonthKey
}

/** Generate n period keys ending at current period, ascending */
function lastNPeriodKeys(period: ChartPeriod, n: number): string[] {
  const now = new Date()
  const keys: string[] = []

  if (period === 'daily') {
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      keys.push(toDateKey(d.toISOString()))
    }
  } else if (period === 'weekly') {
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      keys.push(toWeekKey(d.toISOString()))
    }
  } else if (period === 'monthly') {
    const d = new Date(now)
    d.setDate(1)
    for (let i = n - 1; i >= 0; i--) {
      const tmp = new Date(d)
      tmp.setMonth(d.getMonth() - i)
      keys.push(toMonthKey(tmp.toISOString()))
    }
  } else {
    // yearly
    const thisYear = now.getFullYear()
    for (let i = n - 1; i >= 0; i--) {
      keys.push(String(thisYear - i))
    }
  }

  // Deduplicate while preserving order (weekly can produce duplicate keys near period boundaries)
  return Array.from(new Set(keys))
}

/**
 * Compute financial and stock analytics for any time granularity.
 * Default period count is taken from PERIOD_COUNT; can be overridden.
 */
export function computePeriodAnalytics(
  data: AppData,
  period: ChartPeriod,
  options?: { productIds?: Set<string>; count?: number }
): PeriodAnalytics {
  const count = options?.count ?? PERIOD_COUNT[period]
  const keys = lastNPeriodKeys(period, count)
  const keySet = new Set(keys)
  const keyFn = getKeyFn(period)

  const relevantTransactions = options?.productIds
    ? data.transactions.filter((t) => {
        if (!t.items || t.items.length === 0) return true
        return t.items.some((it) => options.productIds!.has(it.productId))
      })
    : data.transactions

  // Sum transactions by period key
  const salesMap = new Map<string, number>(keys.map((k) => [k, 0]))
  const purchasesMap = new Map<string, number>(keys.map((k) => [k, 0]))

  for (const t of relevantTransactions) {
    const k = keyFn(t.date)
    if (!keySet.has(k)) continue
    if (t.type === 'SALE') salesMap.set(k, (salesMap.get(k) ?? 0) + t.amount)
    else purchasesMap.set(k, (purchasesMap.get(k) ?? 0) + t.amount)
  }

  // Sum stock movements by period key
  const stockMap = new Map<string, number>(keys.map((k) => [k, 0]))
  for (const m of data.stockMovements) {
    if (options?.productIds && !options.productIds.has(m.productId)) continue
    const k = keyFn(m.date)
    if (!keySet.has(k)) continue
    const delta = m.type === 'IN' ? m.quantity : -m.quantity
    stockMap.set(k, (stockMap.get(k) ?? 0) + delta)
  }

  const sales = keys.map((k) => ({ month: k, value: salesMap.get(k) ?? 0 }))
  const purchases = keys.map((k) => ({ month: k, value: purchasesMap.get(k) ?? 0 }))
  const profit = keys.map((k) => ({ month: k, value: (salesMap.get(k) ?? 0) - (purchasesMap.get(k) ?? 0) }))
  const stockNet = keys.map((k) => ({ month: k, value: stockMap.get(k) ?? 0 }))

  return { keys, sales, purchases, profit, stockNet }
}
