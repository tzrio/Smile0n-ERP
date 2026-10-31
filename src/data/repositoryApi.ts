import type { AppData, ContentSchedule, Employee, Product, ProductKind, Production, StockMovement, Transaction } from './types'
import { apiRepo } from './api/apiRepository'
import { getApiSnapshot, mutateAndRefresh } from './api/apiStore'

type Update<T> = Partial<Omit<T, 'id' | 'createdAt'>>

export const repoApi = {
  getAll(): AppData {
    return getApiSnapshot()
  },

  employees: {
    list(): Employee[] {
      return getApiSnapshot().employees
    },
    create(input: { name: string; position: string }): Employee {
      void mutateAndRefresh(() => apiRepo.employees.create(input))
      return {
        id: 'pending',
        name: input.name,
        position: input.position,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
    update(id: string, patch: Update<Employee>): Employee {
      void mutateAndRefresh(() => apiRepo.employees.update(id, patch))
      const current = getApiSnapshot().employees.find((e) => e.id === id)
      if (!current) throw new Error('Karyawan tidak ditemukan (cache)')
      return { ...current, ...patch, updatedAt: new Date().toISOString() }
    },
  },

  products: {
    list(): Product[] {
      return getApiSnapshot().products
    },
    create(input: { name: string; category: string; kind: ProductKind; division?: 'WALL_DECOR' | 'FOOD' }): Product {
      void mutateAndRefresh(() => (apiRepo.products as any).create(input))
      return {
        id: 'pending',
        name: input.name,
        category: input.category,
        kind: input.kind,
        division: input.division ?? 'WALL_DECOR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
    update(id: string, patch: Update<Product>): Product {
      void mutateAndRefresh(() => apiRepo.products.update(id, patch))
      const current = getApiSnapshot().products.find((p) => p.id === id)
      if (!current) throw new Error('Produk tidak ditemukan (cache)')
      return { ...current, ...patch, updatedAt: new Date().toISOString() }
    },
    remove(id: string) {
      void mutateAndRefresh(() => apiRepo.products.remove(id))
    },
  },

  stockMovements: {
    list(): StockMovement[] {
      return getApiSnapshot().stockMovements
    },
    create(input: Omit<StockMovement, 'id'>): StockMovement {
      void mutateAndRefresh(() => apiRepo.stockMovements.create(input))
      return { id: 'pending', ...input }
    },
    remove(id: string) {
      void id
      throw new Error('API mode: hapus riwayat stok belum tersedia (butuh endpoint backend).')
    },
  },

  transactions: {
    list(): Transaction[] {
      return getApiSnapshot().transactions
    },
    create(input: Omit<Transaction, 'id'>): Transaction {
      void mutateAndRefresh(() => apiRepo.transactions.create(input))
      return { id: 'pending', ...input }
    },
    remove(id: string) {
      void id
      throw new Error('API mode: hapus riwayat transaksi belum tersedia (butuh endpoint backend).')
    },
  },

  productions: {
    list(): Production[] {
      return getApiSnapshot().productions
    },
    create(input: Omit<Production, 'id'>): Production {
      void input
      throw new Error('API mode: fitur produksi belum tersedia (butuh endpoint backend).')
    },
    remove(id: string) {
      void id
      throw new Error('API mode: hapus riwayat produksi belum tersedia (butuh endpoint backend).')
    },
  },

  settings: {
    setCashOpeningBalance(value: number) {
      void mutateAndRefresh(() => apiRepo.settings.setCashOpeningBalance(value))
    },
  },

  contentSchedules: {
    list(): ContentSchedule[] {
      return getApiSnapshot().contentSchedules
    },
    create(input: Omit<ContentSchedule, 'id' | 'createdAt' | 'updatedAt'>): ContentSchedule {
      void input
      throw new Error('API mode: fitur timeline konten belum tersedia (butuh endpoint backend).')
    },
    update(id: string, patch: Partial<Omit<ContentSchedule, 'id' | 'createdAt'>>): ContentSchedule {
      void id
      void patch
      throw new Error('API mode: update timeline konten belum tersedia (butuh endpoint backend).')
    },
    remove(id: string) {
      void id
      throw new Error('API mode: hapus timeline konten belum tersedia (butuh endpoint backend).')
    },
  },
}
