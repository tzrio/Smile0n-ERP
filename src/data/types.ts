/**
 * Domain/data types for the app.
 * These types are shared by all repository implementations (local/firebase/api).
 */
export type Employee = {
  id: string
  name: string
  position: string
  role?: 'CEO' | 'CTO' | 'CMO' | 'PENDING'
  createdAt: string
  updatedAt: string
}

export type BusinessDivision = 'WALL_DECOR' | 'FOOD'

export type ProductKind = 'FINISHED' | 'RAW_MATERIAL' | 'OTHER'

export type Product = {
  id: string
  name: string
  category: string
  kind: ProductKind
  division?: BusinessDivision
  createdAt: string
  updatedAt: string
}

export type StockMovementType = 'IN' | 'OUT'

/**
 * Jenis keluar barang untuk mutasi OUT:
 * - SALE: terjual normal (via transaksi)
 * - WASTE: barang basi / kadaluarsa / tidak laku
 * - ADJUSTMENT: penyesuaian stok opname / koreksi manual
 */
export type StockMovementKind = 'SALE' | 'WASTE' | 'ADJUSTMENT' | 'PURCHASE' | 'PRODUCTION'

export type StockMovement = {
  id: string
  productId: string
  type: StockMovementType
  movementKind?: StockMovementKind
  quantity: number
  date: string
  createdAt?: string   // ISO timestamp saat record dibuat — untuk sort tiebreaker
  responsibleEmployeeId: string
  notes?: string
  sourceType?: 'MANUAL' | 'TRANSACTION' | 'PRODUCTION'
  sourceId?: string
}

export type TransactionType = 'PURCHASE' | 'SALE'

export type TransactionItem = {
  productId: string
  quantity: number
  unitPrice: number
}

export type Transaction = {
  id: string
  type: TransactionType
  description: string
  amount: number
  items?: TransactionItem[]
  date: string
  createdAt?: string   // ISO timestamp saat record dibuat — untuk sort tiebreaker
  responsibleEmployeeId: string
}

export type Production = {
  id: string
  rawProductId: string
  rawQuantity: number
  finishedProductId: string
  finishedQuantity: number
  date: string
  responsibleEmployeeId: string
  notes?: string
}

export type AttendanceStatus = 'HADIR' | 'IZIN' | 'ALPHA'

export type MeetingAttendance = {
  name: string
  status: AttendanceStatus
}

export type Meeting = {
  id: string
  title: string
  activities?: string
  startAt: string
  endAt?: string
  location: string
  attendance: MeetingAttendance[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type AppSettings = {
  cashOpeningBalance: number
}

export type ContentScheduleColumn = {
  id: string
  label: string
}

export type ContentScheduleRow = {
  id: string
  values: Record<string, string>
}

export type ContentScheduleCalendarConfig = {
  dateColumnId?: string
  timeColumnId?: string
  titleColumnId?: string
  statusColumnId?: string
  assigneeColumnId?: string
}

export type ContentSchedule = {
  id: string
  title: string
  columns: ContentScheduleColumn[]
  rows: ContentScheduleRow[]
  calendarConfig?: ContentScheduleCalendarConfig
  createdAt: string
  updatedAt: string
}

export type AppData = {
  employees: Employee[]
  products: Product[]
  stockMovements: StockMovement[]
  transactions: Transaction[]
  productions: Production[]
  meetings: Meeting[]
  contentSchedules: ContentSchedule[]
  settings: AppSettings
}
