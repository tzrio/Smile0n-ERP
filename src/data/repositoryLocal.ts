/**
 * Local repository implementation (localStorage).
 * Intended for demo/offline usage with no backend.
 */
import type {
  AppData,
  ContentSchedule,
  Employee,
  Meeting,
  Product,
  ProductKind,
  Production,
  StockMovement,
  Transaction,
} from './types'
import { loadAppData, saveAppData } from './storage'
import { seedData } from './seed'
import { createId } from '../utils/id'
import { isoNow } from '../utils/date'

type Update<T> = Partial<Omit<T, 'id' | 'createdAt'>>
type UpdateSchedule = Partial<Omit<ContentSchedule, 'id' | 'createdAt' | 'updatedAt'>>

let cached: AppData | null = null
let metaUpdatedAt = isoNow()

function cloneSeed(): AppData {
  // seedData is plain JSON-serializable, so JSON clone is sufficient
  return JSON.parse(JSON.stringify(seedData)) as AppData
}

function normalizeData(data: AppData): AppData {
  data.employees = Array.isArray(data.employees) ? data.employees : []
  data.products = Array.isArray(data.products)
    ? data.products.map((p) => {
        const kind = (p as any).kind as ProductKind | undefined
        const division = (p as any).division ?? (p.category === 'Roti & Bakery' || p.name.toLowerCase().includes('bread') ? 'FOOD' : 'WALL_DECOR')
        return { ...p, kind: kind ?? 'FINISHED', division }
      })
    : []
  data.stockMovements = Array.isArray(data.stockMovements) ? data.stockMovements : []
  data.transactions = Array.isArray(data.transactions) ? data.transactions : []
  data.productions = Array.isArray((data as any).productions) ? (data as any).productions : []
  data.meetings = Array.isArray((data as any).meetings) ? (data as any).meetings : []
  data.contentSchedules = Array.isArray((data as any).contentSchedules) ? (data as any).contentSchedules : []
  data.settings = data.settings ?? { cashOpeningBalance: 0 }
  return data
}

function ensureData(): AppData {
  if (cached) return cached
  const existing = loadAppData()
  cached = normalizeData((existing ?? cloneSeed()) as AppData)
  return cached
}

function commit(mutator: (data: AppData) => void) {
  const data = ensureData()
  mutator(data)
  cached = data
  metaUpdatedAt = isoNow()
  saveAppData(data)
}

export const repoLocal = {
  getAll(): AppData {
    return ensureData()
  },

  getMeta() {
    return { ready: true, updatedAt: metaUpdatedAt }
  },

  employees: {
    list(): Employee[] {
      return ensureData().employees
    },
    create(input: { name: string; position: string }): Employee {
      const now = isoNow()
      const e: Employee = {
        id: createId('emp'),
        name: input.name,
        position: input.position,
        createdAt: now,
        updatedAt: now,
      }
      commit((d) => {
        d.employees.unshift(e)
      })
      return e
    },
    update(id: string, patch: Update<Employee>): Employee {
      let updated: Employee | null = null
      commit((d) => {
        d.employees = d.employees.map((e) => {
          if (e.id !== id) return e
          updated = { ...e, ...patch, updatedAt: isoNow() }
          return updated
        })
      })
      if (!updated) throw new Error('Karyawan tidak ditemukan')
      return updated
    },
    remove(id: string): void {
      commit((d) => {
        d.employees = d.employees.filter((e) => e.id !== id)
      })
    },
  },

  products: {
    list(): Product[] {
      return ensureData().products
    },
    create(input: { name: string; category: string; kind: ProductKind; division?: 'WALL_DECOR' | 'FOOD' }): Product {
      const now = isoNow()
      const p: Product = {
        id: createId('prd'),
        name: input.name,
        category: input.category,
        kind: input.kind,
        division: input.division ?? 'WALL_DECOR',
        createdAt: now,
        updatedAt: now,
      }
      commit((d) => {
        d.products.unshift(p)
      })
      return p
    },
    update(id: string, patch: Update<Product>): Product {
      let updated: Product | null = null
      commit((d) => {
        d.products = d.products.map((p) => {
          if (p.id !== id) return p
          updated = { ...p, ...patch, updatedAt: isoNow() }
          return updated
        })
      })
      if (!updated) throw new Error('Produk tidak ditemukan')
      return updated
    },
    remove(id: string) {
      commit((d) => {
        const before = d.products.length
        d.products = d.products.filter((p) => p.id !== id)
        if (d.products.length === before) {
          throw new Error('Produk tidak ditemukan')
        }
        d.stockMovements = d.stockMovements.filter((m) => m.productId !== id)
      })
    },
  },

  stockMovements: {
    list(): StockMovement[] {
      return ensureData().stockMovements
    },
    create(input: Omit<StockMovement, 'id'>): StockMovement {
      if (input.quantity <= 0) throw new Error('Qty harus > 0')
      const m: StockMovement = {
        ...input,
        sourceType: input.sourceType ?? 'MANUAL',
        id: createId('stk'),
      }
      commit((d) => {
        d.stockMovements.unshift(m)
      })
      return m
    },
    remove(id: string) {
      commit((d) => {
        const before = d.stockMovements.length
        d.stockMovements = d.stockMovements.filter((m) => m.id !== id)
        if (d.stockMovements.length === before) {
          throw new Error('Riwayat stok tidak ditemukan')
        }
      })
    },
  },

  transactions: {
    list(): Transaction[] {
      return ensureData().transactions
    },
    create(input: Omit<Transaction, 'id'>): Transaction {
      const hasItems = Array.isArray(input.items) && input.items.length > 0

      const transactionId = createId('trx')

      if (hasItems) {
        for (const it of input.items ?? []) {
          if (!it.productId) throw new Error('Produk item transaksi wajib dipilih')
          if (Number(it.quantity) <= 0) throw new Error('Qty item transaksi harus > 0')
          if (Number(it.unitPrice) <= 0) throw new Error('Harga satuan item transaksi harus > 0')
        }

        const amount = (input.items ?? []).reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0)
        if (amount <= 0) throw new Error('Total transaksi harus > 0')

        const t: Transaction = { ...input, items: input.items, amount, id: transactionId }

        const movementType: StockMovement['type'] = input.type === 'SALE' ? 'OUT' : 'IN'
        const movements: StockMovement[] = (input.items ?? []).map((it) => ({
          id: createId('stk'),
          productId: it.productId,
          type: movementType,
          quantity: Number(it.quantity),
          date: input.date,
          responsibleEmployeeId: input.responsibleEmployeeId,
          sourceType: 'TRANSACTION',
          sourceId: transactionId,
        }))

        commit((d) => {
          d.transactions.unshift(t)
          d.stockMovements.unshift(...movements)
        })

        return t
      }

      if (Number(input.amount) <= 0) throw new Error('Nominal transaksi harus > 0')
      const t: Transaction = { ...input, items: undefined, id: transactionId }
      commit((d) => {
        d.transactions.unshift(t)
      })
      return t
    },
    remove(id: string) {
      commit((d) => {
        const before = d.transactions.length
        d.transactions = d.transactions.filter((t) => t.id !== id)
        if (d.transactions.length === before) {
          throw new Error('Riwayat transaksi tidak ditemukan')
        }
        // Remove auto-generated stock movements from this transaction
        d.stockMovements = d.stockMovements.filter((m) => !(m.sourceType === 'TRANSACTION' && m.sourceId === id))
      })
    },
  },

  productions: {
    list(): Production[] {
      return ensureData().productions
    },
    create(input: Omit<Production, 'id'>): Production {
      if (!input.rawProductId) throw new Error('Pilih bahan mentah')
      if (!input.finishedProductId) throw new Error('Pilih barang jadi')
      if (input.rawProductId === input.finishedProductId) throw new Error('Bahan mentah dan barang jadi harus berbeda')
      if (Number(input.rawQuantity) <= 0) throw new Error('Qty bahan mentah harus > 0')
      if (Number(input.finishedQuantity) <= 0) throw new Error('Qty barang jadi harus > 0')
      if (!input.responsibleEmployeeId) throw new Error('Pilih penanggung jawab')

      const productionId = createId('pro')
      const p: Production = { ...input, id: productionId }

      const movements: StockMovement[] = [
        {
          id: createId('stk'),
          productId: input.rawProductId,
          type: 'OUT',
          quantity: Number(input.rawQuantity),
          date: input.date,
          responsibleEmployeeId: input.responsibleEmployeeId,
          sourceType: 'PRODUCTION',
          sourceId: productionId,
        },
        {
          id: createId('stk'),
          productId: input.finishedProductId,
          type: 'IN',
          quantity: Number(input.finishedQuantity),
          date: input.date,
          responsibleEmployeeId: input.responsibleEmployeeId,
          sourceType: 'PRODUCTION',
          sourceId: productionId,
        },
      ]

      commit((d) => {
        d.productions.unshift(p)
        d.stockMovements.unshift(...movements)
      })

      return p
    },
    remove(id: string) {
      commit((d) => {
        const before = d.productions.length
        d.productions = d.productions.filter((p) => p.id !== id)
        if (d.productions.length === before) throw new Error('Riwayat produksi tidak ditemukan')
        d.stockMovements = d.stockMovements.filter((m) => !(m.sourceType === 'PRODUCTION' && m.sourceId === id))
      })
    },
  },

  meetings: {
    list(): Meeting[] {
      return ensureData().meetings
    },
    create(input: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Meeting {
      const now = isoNow()
      const m: Meeting = {
        id: createId('mtg'),
        title: input.title,
        activities: input.activities,
        startAt: input.startAt,
        endAt: input.endAt,
        location: input.location,
        attendance: Array.isArray(input.attendance) ? input.attendance : [],
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      }
      commit((d) => {
        d.meetings.unshift(m)
      })
      return m
    },
    update(id: string, patch: Update<Meeting>): Meeting {
      let updated: Meeting | null = null
      commit((d) => {
        d.meetings = d.meetings.map((m) => {
          if (m.id !== id) return m
          updated = {
            ...m,
            ...patch,
            attendance: patch.attendance ? (Array.isArray(patch.attendance) ? patch.attendance : []) : m.attendance,
            updatedAt: isoNow(),
          }
          return updated
        })
      })
      if (!updated) throw new Error('Rekap rapat tidak ditemukan')
      return updated
    },
    remove(id: string) {
      commit((d) => {
        const before = d.meetings.length
        d.meetings = d.meetings.filter((m) => m.id !== id)
        if (d.meetings.length === before) throw new Error('Rekap rapat tidak ditemukan')
      })
    },
  },

  contentSchedules: {
    list() {
      return ensureData().contentSchedules
    },
    create(input: Omit<ContentSchedule, 'id' | 'createdAt' | 'updatedAt'>) {
      const now = isoNow()
      const s: ContentSchedule = {
        id: createId('sch'),
        title: input.title,
        columns: Array.isArray(input.columns) ? input.columns : [],
        rows: Array.isArray(input.rows) ? input.rows : [],
        calendarConfig: input.calendarConfig,
        createdAt: now,
        updatedAt: now,
      }
      commit((d) => {
        d.contentSchedules.unshift(s)
      })
      return s
    },
    update(id: string, patch: UpdateSchedule) {
      let updated: ContentSchedule | null = null
      commit((d) => {
        d.contentSchedules = d.contentSchedules.map((s) => {
          if (s.id !== id) return s
          updated = {
            ...s,
            ...patch,
            columns: patch.columns ? (Array.isArray(patch.columns) ? patch.columns : []) : s.columns,
            rows: patch.rows ? (Array.isArray(patch.rows) ? patch.rows : []) : s.rows,
            calendarConfig: patch.calendarConfig ?? s.calendarConfig,
            updatedAt: isoNow(),
          }
          return updated
        })
      })
      if (!updated) throw new Error('Timeline konten tidak ditemukan')
      return updated
    },
    remove(id: string) {
      commit((d) => {
        const before = d.contentSchedules.length
        d.contentSchedules = d.contentSchedules.filter((s) => s.id !== id)
        if (d.contentSchedules.length === before) throw new Error('Timeline konten tidak ditemukan')
      })
    },
  },

  settings: {
    setCashOpeningBalance(value: number) {
      commit((d) => {
        d.settings.cashOpeningBalance = value
      })
    },
  },
}
