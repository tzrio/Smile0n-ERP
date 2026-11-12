import type {
  AppData,
  AppSettings,
  ContentSchedule,
  Employee,
  Meeting,
  Product,
  Production,
  StockMovement,
  Transaction,
  TransactionItem,
} from './types'
import { createId } from '../utils/id'
import { isoNow } from '../utils/date'
import { getFirestoreDb } from '../firebase/firebase'
import { getFirebaseAuth } from '../firebase/firebase'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

/**
 * Firebase repository implementation (Auth + Firestore).
 * - Uses snapshot listeners (onSnapshot) to keep UI reactive
 * - Provides repo meta (`getMeta`) so UI can show skeletons until hydrated
 */
const EVENT_NAME = 'wallDecorAdmin.data.changed'

type Unsub = () => void

let authWatcherStarted = false
let unsubAuth: Unsub | null = null
let unsubMyUserDoc: Unsub | null = null

let dataStarted = false
let dataUnsubs: Unsub[] = []

let db: ReturnType<typeof getFirestoreDb> | null = null

let snapshot: AppData = {
  employees: [],
  products: [],
  stockMovements: [],
  transactions: [],
  productions: [],
  meetings: [],
  contentSchedules: [],
  settings: { cashOpeningBalance: 0 },
}

let metaReady = false
let metaUpdatedAt = ''

function markMetaReady() {
  if (metaReady) return
  metaReady = true
  metaUpdatedAt = isoNow()
  notify()
}

function notify() {
  window.dispatchEvent(new Event(EVENT_NAME))
}

function toIsoMaybe(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const anyVal = value as any
    if (typeof anyVal.toDate === 'function') {
      return anyVal.toDate().toISOString()
    }
  }
  try {
    return new Date(value as any).toISOString()
  } catch {
    return ''
  }
}

function mapEmployee(id: string, data: any): Employee {
  const createdAt = toIsoMaybe(data?.createdAt) || isoNow()
  const updatedAt = toIsoMaybe(data?.updatedAt) || createdAt
  const role = String(data?.role ?? '')
  return {
    id,
    name: String(data?.name ?? ''),
    position: String(data?.position ?? data?.role ?? ''),
    role: role === 'CEO' || role === 'CTO' || role === 'CMO' || role === 'PENDING' ? (role as any) : undefined,
    createdAt,
    updatedAt,
  }
}

function mapProduct(id: string, data: any): Product {
  const createdAt = toIsoMaybe(data?.createdAt) || isoNow()
  const updatedAt = toIsoMaybe(data?.updatedAt) || createdAt
  const kind = String(data?.kind ?? 'FINISHED')
  const division = data?.division === 'FOOD' ? 'FOOD' : 'WALL_DECOR'
  return {
    id,
    name: String(data?.name ?? ''),
    category: String(data?.category ?? ''),
    kind: kind === 'RAW_MATERIAL' || kind === 'OTHER' ? (kind as any) : 'FINISHED',
    division,
    createdAt,
    updatedAt,
  }
}

function mapStockMovement(id: string, data: any): StockMovement {
  const validKinds = ['SALE', 'WASTE', 'ADJUSTMENT', 'PURCHASE', 'PRODUCTION']
  return {
    id,
    productId: String(data?.productId ?? ''),
    type: data?.type === 'OUT' ? 'OUT' : 'IN',
    movementKind: validKinds.includes(data?.movementKind) ? data.movementKind : undefined,
    quantity: Number(data?.quantity ?? 0),
    date: toIsoMaybe(data?.date) || isoNow(),
    responsibleEmployeeId: String(data?.responsibleEmployeeId ?? data?.responsibleUserId ?? ''),
    notes: data?.notes ? String(data.notes) : undefined,
    sourceType: data?.sourceType === 'TRANSACTION' || data?.sourceType === 'PRODUCTION' ? data.sourceType : (data?.sourceType === 'MANUAL' ? 'MANUAL' : undefined),
    sourceId: data?.sourceId ? String(data.sourceId) : undefined,
  }
}

function mapTransaction(id: string, data: any): Transaction {
  return {
    id,
    type: data?.type === 'SALE' ? 'SALE' : 'PURCHASE',
    description: String(data?.description ?? ''),
    amount: Number(data?.amount ?? 0),
    items: Array.isArray(data?.items)
      ? data.items
          .map((it: any) => ({
            productId: String(it?.productId ?? ''),
            quantity: Number(it?.quantity ?? 0),
            unitPrice: Number(it?.unitPrice ?? 0),
          }))
          .filter((it: TransactionItem) => Boolean(it.productId))
      : undefined,
    date: toIsoMaybe(data?.date) || isoNow(),
    responsibleEmployeeId: String(data?.responsibleEmployeeId ?? data?.responsibleUserId ?? ''),
  }
}

function mapProduction(id: string, data: any): Production {
  return {
    id,
    rawProductId: String(data?.rawProductId ?? ''),
    rawQuantity: Number(data?.rawQuantity ?? 0),
    finishedProductId: String(data?.finishedProductId ?? ''),
    finishedQuantity: Number(data?.finishedQuantity ?? 0),
    date: toIsoMaybe(data?.date) || isoNow(),
    responsibleEmployeeId: String(data?.responsibleEmployeeId ?? data?.responsibleUserId ?? ''),
    notes: data?.notes ? String(data.notes) : undefined,
  }
}

function mapMeeting(id: string, data: any): Meeting {
  const createdAt = toIsoMaybe(data?.createdAt) || isoNow()
  const updatedAt = toIsoMaybe(data?.updatedAt) || createdAt
  const attendance = Array.isArray(data?.attendance)
    ? data.attendance
        .map((a: any) => ({
          name: String(a?.name ?? '').trim(),
          status: a?.status === 'IZIN' ? 'IZIN' : a?.status === 'ALPHA' ? 'ALPHA' : 'HADIR',
        }))
        .filter((a: any) => Boolean(a.name))
    : []

  return {
    id,
    title: String(data?.title ?? ''),
    activities: data?.activities ? String(data.activities) : undefined,
    startAt: toIsoMaybe(data?.startAt) || createdAt,
    endAt: data?.endAt ? (toIsoMaybe(data.endAt) || undefined) : undefined,
    location: String(data?.location ?? ''),
    attendance,
    notes: data?.notes ? String(data.notes) : undefined,
    createdAt,
    updatedAt,
  }
}

function mapContentSchedule(id: string, data: any): ContentSchedule {
  const createdAt = toIsoMaybe(data?.createdAt) || isoNow()
  const updatedAt = toIsoMaybe(data?.updatedAt) || createdAt
  const columns = Array.isArray(data?.columns)
    ? data.columns
        .map((c: any) => ({ id: String(c?.id ?? ''), label: String(c?.label ?? '') }))
        .filter((c: any) => Boolean(c.id) && Boolean(c.label))
    : []
  const rows = Array.isArray(data?.rows)
    ? data.rows
        .map((r: any) => ({
          id: String(r?.id ?? ''),
          values: typeof r?.values === 'object' && r?.values ? (r.values as Record<string, string>) : {},
        }))
        .filter((r: any) => Boolean(r.id))
    : []

  return {
    id,
    title: String(data?.title ?? 'Timeline Konten'),
    columns,
    rows,
    calendarConfig: typeof data?.calendarConfig === 'object' ? (data.calendarConfig as any) : undefined,
    createdAt,
    updatedAt,
  }
}

function resetToEmpty() {
  snapshot = {
    employees: [],
    products: [],
    stockMovements: [],
    transactions: [],
    productions: [],
    meetings: [],
    contentSchedules: [],
    settings: { cashOpeningBalance: 0 },
  }
  metaReady = false
  metaUpdatedAt = ''
  notify()
}

function handleListenerError(scope: string, err: unknown) {
  console.error(`Firestore listener error (${scope})`, err)

  const message =
    err && typeof err === 'object' && 'message' in err
      ? String((err as any).message)
      : 'Missing or insufficient permissions.'

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('wallDecorAdmin.toast', {
        detail: {
          type: 'error',
          message:
            `Akses Firestore ditolak (${scope}). ${message} ` +
            'Cek 2 hal: (1) Firestore Rules di Console sudah dipaste dari file firestore.rules lalu Publish, ' +
            '(2) di collection users/{uid}, field role akun kamu harus CEO/CTO/CMO. Setelah itu refresh.',
        },
      })
    )
  }

  // If a listener starts while logged out / role not staff, Firestore can error (permission-denied).
  // Stop data listeners but keep auth watcher alive so we can retry after login / role update.
  stopDataListeners()
  resetToEmpty()
}

function isStaffRole(role: unknown): boolean {
  return role === 'CEO' || role === 'CTO' || role === 'CMO'
}

function startDataListeners() {
  if (dataStarted) return
  dataStarted = true

  metaReady = false
  metaUpdatedAt = ''

  const firestoreDb = (db ??= getFirestoreDb())

  // Sinkron karyawan = users/{uid}
  const employeesRef = collection(firestoreDb, 'users')
  const productsRef = collection(firestoreDb, 'products')
  const stockRef = collection(firestoreDb, 'stockMovements')
  const trxRef = collection(firestoreDb, 'transactions')
  const prodRef = collection(firestoreDb, 'productions')
  const meetingsRef = collection(firestoreDb, 'meetings')
  const contentSchedulesRef = collection(firestoreDb, 'contentSchedules')
  const settingsRef = doc(firestoreDb, 'settings', 'app')

  const unsubEmployees = onSnapshot(
    query(employeesRef),
    (qs) => {
      snapshot = {
        ...snapshot,
        employees: qs.docs.map((d) => mapEmployee(d.id, d.data())),
      }
      markMetaReady()
      notify()
    },
    (err) => handleListenerError('users', err)
  )

  const unsubProducts = onSnapshot(
    query(productsRef),
    (qs) => {
      snapshot = {
        ...snapshot,
        products: qs.docs.map((d) => mapProduct(d.id, d.data())),
      }
      markMetaReady()
      notify()
    },
    (err) => handleListenerError('products', err)
  )

  const unsubStock = onSnapshot(
    query(stockRef),
    (qs) => {
      snapshot = {
        ...snapshot,
        stockMovements: qs.docs.map((d) => mapStockMovement(d.id, d.data())),
      }
      markMetaReady()
      notify()
    },
    (err) => handleListenerError('stockMovements', err)
  )

  const unsubTrx = onSnapshot(
    query(trxRef),
    (qs) => {
      snapshot = {
        ...snapshot,
        transactions: qs.docs.map((d) => mapTransaction(d.id, d.data())),
      }
      markMetaReady()
      notify()
    },
    (err) => handleListenerError('transactions', err)
  )

  const unsubProd = onSnapshot(
    query(prodRef),
    (qs) => {
      snapshot = {
        ...snapshot,
        productions: qs.docs.map((d) => mapProduction(d.id, d.data())),
      }
      markMetaReady()
      notify()
    },
    (err) => handleListenerError('productions', err)
  )

  const unsubMeetings = onSnapshot(
    query(meetingsRef),
    (qs) => {
      snapshot = {
        ...snapshot,
        meetings: qs.docs.map((d) => mapMeeting(d.id, d.data())),
      }
      markMetaReady()
      notify()
    },
    (err) => handleListenerError('meetings', err)
  )

  const unsubSchedules = onSnapshot(
    query(contentSchedulesRef),
    (qs) => {
      snapshot = {
        ...snapshot,
        contentSchedules: qs.docs.map((d) => mapContentSchedule(d.id, d.data())),
      }
      markMetaReady()
      notify()
    },
    (err) => handleListenerError('contentSchedules', err)
  )

  const unsubSettings = onSnapshot(
    settingsRef,
    (ds) => {
      const data = ds.data() as any
      snapshot = {
        ...snapshot,
        settings: {
          cashOpeningBalance: Number(data?.cashOpeningBalance ?? 0),
        },
      }
      markMetaReady()
      notify()
    },
    (err) => handleListenerError('settings/app', err)
  )

  dataUnsubs = [unsubEmployees, unsubProducts, unsubStock, unsubTrx, unsubProd, unsubMeetings, unsubSchedules, unsubSettings]
}

function stopDataListeners() {
  for (const u of dataUnsubs) u()
  dataUnsubs = []
  dataStarted = false
  metaReady = false
  metaUpdatedAt = ''
}

function startAuthWatcher() {
  if (authWatcherStarted) return
  authWatcherStarted = true

  const auth = getFirebaseAuth()
  const firestoreDb = (db ??= getFirestoreDb())

  unsubAuth = onAuthStateChanged(auth, (fbUser) => {
    if (unsubMyUserDoc) {
      unsubMyUserDoc()
      unsubMyUserDoc = null
    }

    if (!fbUser) {
      stopDataListeners()
      resetToEmpty()
      return
    }

    const myRef = doc(firestoreDb, 'users', fbUser.uid)
    unsubMyUserDoc = onSnapshot(
      myRef,
      (ds) => {
        const role = (ds.data() as any)?.role
        if (isStaffRole(role)) {
          startDataListeners()
        } else {
          stopDataListeners()
          resetToEmpty()
        }
      },
      (err) => handleListenerError('users/myProfile', err)
    )
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stopDataListeners()
    if (unsubMyUserDoc) unsubMyUserDoc()
    if (unsubAuth) unsubAuth()
  })
}

export const repoFirebase = {
  init() {
    // Start auth watcher first; data listeners will start automatically when role is staff.
    startAuthWatcher()
  },

  getAll(): AppData {
    return snapshot
  },

  getMeta() {
    return { ready: metaReady, updatedAt: metaUpdatedAt }
  },

  employees: {
    list(): Employee[] {
      return snapshot.employees
    },
    create(input: { name: string; position: string }): Employee {
      void input
      throw new Error(
        'Di mode Firebase, penambahan karyawan/user harus lewat Firebase Auth (Console) atau Cloud Function (lebih aman).'
      )
    },
    async update(id: string, patch: Partial<Omit<Employee, 'id' | 'createdAt'>>): Promise<Employee> {
      const firestoreDb = (db ??= getFirestoreDb())
      const nextUpdatedAt = isoNow()
      await updateDoc(doc(firestoreDb, 'users', id), { ...patch, updatedAt: nextUpdatedAt } as any)
      const current = snapshot.employees.find((x) => x.id === id)
      if (!current) throw new Error('Karyawan tidak ditemukan')
      return { ...current, ...patch, updatedAt: nextUpdatedAt }
    },
  },

  products: {
    list(): Product[] {
      return snapshot.products
    },
    async create(input: { name: string; category: string; kind: Product['kind'] }): Promise<Product> {
      const firestoreDb = (db ??= getFirestoreDb())
      const now = isoNow()
      const id = createId('prd')
      const p: Product = {
        id,
        name: input.name,
        category: input.category,
        kind: input.kind,
        division: (input as any).division ?? 'WALL_DECOR',
        createdAt: now,
        updatedAt: now,
      }
      await setDoc(doc(firestoreDb, 'products', id), p)
      return p
    },
    async update(id: string, patch: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Product> {
      const firestoreDb = (db ??= getFirestoreDb())
      const nextUpdatedAt = isoNow()
      await updateDoc(doc(firestoreDb, 'products', id), { ...patch, updatedAt: nextUpdatedAt } as any)
      const current = snapshot.products.find((x) => x.id === id)
      if (!current) throw new Error('Produk tidak ditemukan')
      return { ...current, ...patch, updatedAt: nextUpdatedAt }
    },
    async remove(id: string): Promise<void> {
      const firestoreDb = (db ??= getFirestoreDb())
      await deleteDoc(doc(firestoreDb, 'products', id))
      // related stockMovements are left as-is in Firestore (log/audit). UI will show productId fallback.
    },
  },

  stockMovements: {
    list(): StockMovement[] {
      return snapshot.stockMovements
    },
    async create(input: Omit<StockMovement, 'id'>): Promise<StockMovement> {
      const firestoreDb = (db ??= getFirestoreDb())
      if (input.quantity <= 0) throw new Error('Qty harus > 0')
      const id = createId('stk')
      const m: StockMovement = {
        ...input,
        sourceType: input.sourceType ?? 'MANUAL',
        id,
        ...(input.movementKind ? { movementKind: input.movementKind } : {}),
        ...(input.notes ? { notes: input.notes } : {}),
      }
      await setDoc(doc(firestoreDb, 'stockMovements', id), m)
      return m
    },
    async remove(id: string): Promise<void> {
      const firestoreDb = (db ??= getFirestoreDb())
      await deleteDoc(doc(firestoreDb, 'stockMovements', id))
    },
  },

  transactions: {
    list(): Transaction[] {
      return snapshot.transactions
    },
    async create(input: Omit<Transaction, 'id'>): Promise<Transaction> {
      const firestoreDb = (db ??= getFirestoreDb())
      const transactionId = createId('trx')
      const hasItems = Array.isArray(input.items) && input.items.length > 0

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
        const batch = writeBatch(firestoreDb)

        batch.set(doc(firestoreDb, 'transactions', transactionId), t)

        for (const it of input.items ?? []) {
          const movementId = createId('stk')
          const m: StockMovement = {
            id: movementId,
            productId: it.productId,
            type: movementType,
            quantity: Number(it.quantity),
            date: input.date,
            responsibleEmployeeId: input.responsibleEmployeeId,
            sourceType: 'TRANSACTION',
            sourceId: transactionId,
          }
          batch.set(doc(firestoreDb, 'stockMovements', movementId), m)
        }

        await batch.commit()
        return t
      }

      if (Number(input.amount) <= 0) throw new Error('Nominal transaksi harus > 0')
      const t: Transaction = { ...input, items: undefined, id: transactionId }
      await setDoc(doc(firestoreDb, 'transactions', transactionId), t)
      return t
    },
    async remove(id: string): Promise<void> {
      const firestoreDb = (db ??= getFirestoreDb())
      // Cascade delete stock movements created from this transaction
      const q = query(
        collection(firestoreDb, 'stockMovements'),
        where('sourceType', '==', 'TRANSACTION'),
        where('sourceId', '==', id)
      )
      const snap = await getDocs(q)
      const batch = writeBatch(firestoreDb)
      for (const d of snap.docs) batch.delete(d.ref)
      batch.delete(doc(firestoreDb, 'transactions', id))
      await batch.commit()
    },
  },

  productions: {
    list(): Production[] {
      return snapshot.productions
    },
    async create(input: Omit<Production, 'id'>): Promise<Production> {
      const firestoreDb = (db ??= getFirestoreDb())
      if (!input.rawProductId) throw new Error('Pilih bahan mentah')
      if (!input.finishedProductId) throw new Error('Pilih barang jadi')
      if (input.rawProductId === input.finishedProductId) throw new Error('Bahan mentah dan barang jadi harus berbeda')
      if (Number(input.rawQuantity) <= 0) throw new Error('Qty bahan mentah harus > 0')
      if (Number(input.finishedQuantity) <= 0) throw new Error('Qty barang jadi harus > 0')
      if (!input.responsibleEmployeeId) throw new Error('Pilih penanggung jawab')

      const productionId = createId('pro')
      const p: Production = { ...input, id: productionId }

      const batch = writeBatch(firestoreDb)
      batch.set(doc(firestoreDb, 'productions', productionId), p)

      const outId = createId('stk')
      const inId = createId('stk')
      const out: StockMovement = {
        id: outId,
        productId: input.rawProductId,
        type: 'OUT',
        quantity: Number(input.rawQuantity),
        date: input.date,
        responsibleEmployeeId: input.responsibleEmployeeId,
        sourceType: 'PRODUCTION',
        sourceId: productionId,
      }
      const inn: StockMovement = {
        id: inId,
        productId: input.finishedProductId,
        type: 'IN',
        quantity: Number(input.finishedQuantity),
        date: input.date,
        responsibleEmployeeId: input.responsibleEmployeeId,
        sourceType: 'PRODUCTION',
        sourceId: productionId,
      }

      batch.set(doc(firestoreDb, 'stockMovements', outId), out)
      batch.set(doc(firestoreDb, 'stockMovements', inId), inn)

      await batch.commit()
      return p
    },
    async remove(id: string): Promise<void> {
      const firestoreDb = (db ??= getFirestoreDb())
      const q = query(
        collection(firestoreDb, 'stockMovements'),
        where('sourceType', '==', 'PRODUCTION'),
        where('sourceId', '==', id)
      )
      const snap = await getDocs(q)
      const batch = writeBatch(firestoreDb)
      for (const d of snap.docs) batch.delete(d.ref)
      batch.delete(doc(firestoreDb, 'productions', id))
      await batch.commit()
    },
  },

  settings: {
    async setCashOpeningBalance(value: number) {
      const firestoreDb = (db ??= getFirestoreDb())
      await setDoc(doc(firestoreDb, 'settings', 'app'), { cashOpeningBalance: value } as AppSettings, { merge: true })
    },
  },

  meetings: {
    list(): Meeting[] {
      return snapshot.meetings
    },
    async create(input: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<Meeting> {
      const firestoreDb = (db ??= getFirestoreDb())
      const now = isoNow()
      const id = createId('mtg')
      const m: Meeting = {
        id,
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
      await setDoc(doc(firestoreDb, 'meetings', id), m)
      return m
    },
    async update(id: string, patch: Partial<Omit<Meeting, 'id' | 'createdAt'>>): Promise<Meeting> {
      const firestoreDb = (db ??= getFirestoreDb())
      const nextUpdatedAt = isoNow()
      await updateDoc(doc(firestoreDb, 'meetings', id), { ...patch, updatedAt: nextUpdatedAt } as any)
      const current = snapshot.meetings.find((x) => x.id === id)
      if (!current) throw new Error('Rekap rapat tidak ditemukan')
      return { ...current, ...patch, updatedAt: nextUpdatedAt }
    },
    async remove(id: string): Promise<void> {
      const firestoreDb = (db ??= getFirestoreDb())
      await deleteDoc(doc(firestoreDb, 'meetings', id))
    },
  },

  contentSchedules: {
    list(): ContentSchedule[] {
      return snapshot.contentSchedules
    },
    async create(input: Omit<ContentSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentSchedule> {
      const firestoreDb = (db ??= getFirestoreDb())
      const now = isoNow()
      const id = createId('sch')
      const schedule: ContentSchedule = {
        id,
        title: input.title,
        columns: Array.isArray(input.columns) ? input.columns : [],
        rows: Array.isArray(input.rows) ? input.rows : [],
        calendarConfig: input.calendarConfig,
        createdAt: now,
        updatedAt: now,
      }
      await setDoc(doc(firestoreDb, 'contentSchedules', id), schedule)
      return schedule
    },
    async update(id: string, patch: Partial<Omit<ContentSchedule, 'id' | 'createdAt'>>): Promise<ContentSchedule> {
      const firestoreDb = (db ??= getFirestoreDb())
      const nextUpdatedAt = isoNow()
      await updateDoc(doc(firestoreDb, 'contentSchedules', id), { ...patch, updatedAt: nextUpdatedAt } as any)
      const current = snapshot.contentSchedules.find((x) => x.id === id)
      if (!current) throw new Error('Timeline konten tidak ditemukan')
      return { ...current, ...patch, updatedAt: nextUpdatedAt }
    },
    async remove(id: string): Promise<void> {
      const firestoreDb = (db ??= getFirestoreDb())
      await deleteDoc(doc(firestoreDb, 'contentSchedules', id))
    },
  },
}
