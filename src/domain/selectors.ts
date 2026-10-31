import type { AppData, Product, StockMovement, Transaction } from '../data/types'
import { toMonthKey } from '../utils/date'

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
