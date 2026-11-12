/**
 * Transactions page:
 * Supports item-based transactions (with auto stock updates) and direct cash records.
 * Clean, compact ERP table layout with division context.
 */
import { Fragment, useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { PageHeader } from '../components/PageHeader'
import { Select } from '../components/Select'
import { Table } from '../components/Table'
import { EmptyState } from '../components/EmptyState'
import { repo } from '../data/repository'
import { useAppData } from '../data/useAppData'
import { useDivision } from '../app/DivisionContext'
import type { TransactionItem, TransactionType } from '../data/types'
import { formatDate, isoNow } from '../utils/date'
import { formatIDR } from '../utils/money'
import { downloadCsv } from '../utils/csv'
import { useToast } from '../app/ToastContext'
import { useAuth } from '../auth/AuthContext'

type TxMode = 'ITEMS' | 'SERVICE'

export function TransactionsPage() {
  const data = useAppData()
  const toast = useToast()
  const auth = useAuth()
  const { division } = useDivision()

  const canDeleteHistory = auth.hasRole(['CEO', 'CTO', 'CMO'])

  const [type, setType] = useState<TransactionType>('SALE')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => formatDate(isoNow()))
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState(data.employees[0]?.id ?? '')

  const [mode, setMode] = useState<TxMode>('ITEMS')
  const [serviceAmount, setServiceAmount] = useState(0)

  // Scope products for selection
  const scopedProducts = useMemo(() => {
    if (division === 'ALL') return data.products
    return data.products.filter((p) => p.division === division)
  }, [data.products, division])

  const [items, setItems] = useState<TransactionItem[]>([
    { productId: scopedProducts[0]?.id ?? data.products[0]?.id ?? '', quantity: 1, unitPrice: 0 },
  ])

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null)

  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL')
  const [filterQuery, setFilterQuery] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0)
  }, [items])

  const history = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    const fromIso = filterFrom ? new Date(filterFrom).toISOString() : ''
    const toIso = filterTo ? new Date(filterTo).toISOString() : ''
    const validProductIds = new Set(scopedProducts.map((p) => p.id))

    return data.transactions
      .filter((t) => {
        if (division !== 'ALL') {
          // If transaction has items, check if any belong to current division
          if (t.items && t.items.length > 0) {
            const hasDivisionItem = t.items.some((it) => validProductIds.has(it.productId))
            if (!hasDivisionItem) return false
          }
        }
        if (filterType !== 'ALL' && t.type !== filterType) return false
        if (q && !`${t.description}`.toLowerCase().includes(q)) return false
        if (fromIso && t.date < fromIso) return false
        if (toIso && t.date > toIso) return false
        return true
      })
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [data.transactions, division, filterFrom, filterQuery, filterTo, filterType, scopedProducts])

  function exportTransactionsCsv() {
    const rows = history
    const filename = `transaksi-${new Date(isoNow()).toISOString().slice(0, 10)}`

    downloadCsv(filename, rows, [
      { header: 'Tanggal', value: (t) => t.date },
      { header: 'Tipe', value: (t) => t.type },
      { header: 'Deskripsi', value: (t) => t.description },
      { header: 'Total Nilai', value: (t) => t.amount },
      {
        header: 'Penanggung Jawab',
        value: (t) => data.employees.find((e) => e.id === t.responsibleEmployeeId)?.name ?? t.responsibleEmployeeId,
      },
      {
        header: 'Daftar Item',
        value: (t) =>
          Array.isArray(t.items)
            ? t.items
                .map((it) => {
                  const pName = data.products.find((p) => p.id === it.productId)?.name ?? it.productId
                  return `${pName} (Qty: ${it.quantity} @${it.unitPrice})`
                })
                .join('; ')
            : 'Jasa/Biaya Langsung',
      },
    ])

    toast.success('CSV transaksi berhasil diexport')
  }

  useEffect(() => {
    if (responsibleEmployeeId && data.employees.some((e) => e.id === responsibleEmployeeId)) return
    setResponsibleEmployeeId(data.employees[0]?.id ?? '')
  }, [data.employees, responsibleEmployeeId])

  useEffect(() => {
    setItems((prev) => {
      if (prev.length === 0) return []
      const fallbackId = scopedProducts[0]?.id ?? data.products[0]?.id ?? ''
      return prev.map((it) => {
        if (!it.productId || !data.products.some((p) => p.id === it.productId)) {
          return { ...it, productId: fallbackId }
        }
        return it
      })
    })
  }, [data.products, scopedProducts])

  function addItemRow() {
    const fallbackId = scopedProducts[0]?.id ?? data.products[0]?.id ?? ''
    setItems((prev) => [...prev, { productId: fallbackId, quantity: 1, unitPrice: 0 }])
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function ensureAtLeastOneItem() {
    const fallbackId = scopedProducts[0]?.id ?? data.products[0]?.id ?? ''
    setItems((prev) => (prev.length ? prev : [{ productId: fallbackId, quantity: 1, unitPrice: 0 }]))
  }

  async function addTransaction() {
    setError(null)
    setSaving(true)
    try {
      if (!description.trim()) {
        setError('Keterangan / deskripsi transaksi wajib diisi')
        return
      }
      if (!responsibleEmployeeId) {
        setError('Pilih anggota penanggung jawab')
        return
      }
      const dateIso = new Date(date).toISOString()

      if (mode === 'SERVICE') {
        if (Number(serviceAmount) <= 0) {
          setError('Nominal biaya / pendapatan harus lebih dari 0')
          return
        }
        await Promise.resolve(
          (repo as any).transactions.create({
            type,
            description: description.trim(),
            amount: Number(serviceAmount),
            items: undefined,
            date: dateIso,
            responsibleEmployeeId,
          })
        )
      } else {
        if (!items.length) {
          setError('Masukkan minimal 1 produk barang')
          return
        }
        for (const it of items) {
          if (!it.productId) {
            setError('Semua baris item wajib memilih produk')
            return
          }
          if (Number(it.quantity) <= 0) {
            setError('Qty item harus > 0')
            return
          }
          if (Number(it.unitPrice) <= 0) {
            setError('Harga satuan harus > 0')
            return
          }
        }
        if (totalAmount <= 0) {
          setError('Total transaksi harus > 0')
          return
        }
        await Promise.resolve(
          (repo as any).transactions.create({
            type,
            description: description.trim(),
            amount: 0,
            items,
            date: dateIso,
            responsibleEmployeeId,
          })
        )
      }

      setDescription('')
      setServiceAmount(0)
      const fallbackId = scopedProducts[0]?.id ?? data.products[0]?.id ?? ''
      setItems([{ productId: fallbackId, quantity: 1, unitPrice: 0 }])
      setMode('ITEMS')
      toast.success(
        type === 'SALE' ? 'Penjualan berhasil dicatat' : 'Pembelian / pengadaan berhasil dicatat'
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal mencatat transaksi'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function deleteTransaction(transactionId: string) {
    setError(null)
    if (!canDeleteHistory) {
      const msg = 'Hanya pimpinan (CEO/CTO/CMO) yang berhak menghapus pembukuan transaksi'
      setError(msg)
      toast.error(msg)
      return
    }

    setDeletingTransactionId(transactionId)
    try {
      const ok = window.confirm(
        'Hapus data transaksi ini? Mutasi stok terkait juga akan otomatis dibatalkan.'
      )
      if (!ok) return
      await Promise.resolve((repo as any).transactions.remove(transactionId))
      toast.success('Transaksi dihapus')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus transaksi'
      setError(msg)
      toast.error(msg)
    } finally {
      setDeletingTransactionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pencatatan Transaksi & Kas"
        subtitle="Catat penjualan produk, kulakan stok reseller makanan, atau belanja bahan baku kerajinan."
        right={
          <Button
            variant="secondary"
            size="sm"
            onClick={exportTransactionsCsv}
            disabled={history.length === 0}
          >
            Export Pembukuan
          </Button>
        }
      />

      {/* Form Input Transaksi */}
      <Card
        title="Input Transaksi Baru"
        description="Transaksi barang otomatis memperbarui saldo kas dan stok inventaris secara real-time."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Jenis Transaksi
            </label>
            <div className="mt-1">
              <Select value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
                <option value="SALE">Penjualan (+ Pemasukan Kas)</option>
                <option value="PURCHASE">Pembelian / Kulakan (- Pengeluaran Kas)</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Kategori Transaksi
            </label>
            <div className="mt-1">
              <Select
                value={mode}
                onChange={(e) => {
                  const next = e.target.value as TxMode
                  setMode(next)
                  if (next === 'ITEMS') ensureAtLeastOneItem()
                }}
              >
                <option value="ITEMS">Barang / Dagangan (Update Stok Otomatis)</option>
                <option value="SERVICE">Operasional / Jasa (Tanpa Update Stok)</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Tanggal Transaksi
            </label>
            <div className="mt-1">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Keterangan / Deskripsi
            </label>
            <div className="mt-1">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === 'SALE'
                    ? 'Misal: Penjualan 10 pcs Garlic Bread ke Toko A'
                    : 'Misal: Kulakan 20 pcs Chocolate Bread dari supplier'
                }
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Penanggung Jawab
            </label>
            <div className="mt-1">
              <Select
                value={responsibleEmployeeId}
                onChange={(e) => setResponsibleEmployeeId(e.target.value)}
              >
                {data.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Mode Operasional / Jasa */}
          {mode === 'SERVICE' ? (
            <div className="sm:col-span-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nominal Kas (IDR)
              </label>
              <div className="mt-1 max-w-sm">
                <Input
                  type="number"
                  min={1}
                  value={serviceAmount}
                  onChange={(e) => setServiceAmount(Number(e.target.value))}
                  placeholder="Contoh: 150000"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Cocok untuk biaya bensin pengiriman, listrik, pulsa, atau pendapatan jasa tanpa stok.
              </p>
            </div>
          ) : (
            /* Mode Item Dagangan */
            <div className="sm:col-span-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Rincian Barang yang Ditransaksikan
                </span>
                <span className="text-xs text-slate-500">
                  {type === 'SALE' ? 'Mengurangi stok (OUT)' : 'Menambah stok (IN)'}
                </span>
              </div>

              <div className="space-y-2.5">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_100px_160px_auto] items-center"
                  >
                    <Select
                      value={it.productId}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, productId: e.target.value } : x))
                        )
                      }
                    >
                      {scopedProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.division === 'FOOD' ? 'Food' : 'Decor'}] {p.name}
                        </option>
                      ))}
                    </Select>

                    <Input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, quantity: Number(e.target.value) } : x
                          )
                        )
                      }
                      placeholder="Qty"
                    />

                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={it.unitPrice}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, unitPrice: Number(e.target.value) } : x
                            )
                          )
                        }
                        placeholder="Harga / unit (IDR)"
                      />
                      {/* Jika ada lebih dari 1 baris dan harga berbeda dengan baris lain, tampilkan badge */}
                      {items.length > 1 && it.unitPrice > 0 && items.some((x, i) => i !== idx && x.productId === it.productId && x.unitPrice !== it.unitPrice) && (
                        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-amber-500 px-1 py-0.5 text-[9px] font-bold text-white">
                          ≠
                        </span>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700"
                      onClick={() => removeItemRow(idx)}
                    >
                      Hapus
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={addItemRow}>
                    + Tambah Produk
                  </Button>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setItems([])}
                    >
                      Reset
                    </Button>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Total Nominal</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {formatIDR(totalAmount)}
                  </div>
                </div>
              </div>
              {type === 'SALE' && items.length > 0 && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                  💡 Harga satuan bisa beda-beda per baris — gunakan baris terpisah untuk produk yang dijual dengan harga diskon.
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button type="button" onClick={addTransaction} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
          </Button>
        </div>
      </Card>

      {/* Riwayat Transaksi Table */}
      <Card
        title="Buku Transaksi Kas"
        description="Daftar mutasi arus kas masuk dan keluar yang tercatat di sistem Smile0n."
        right={
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {history.length} Catatan
          </span>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="ALL">Semua Jenis Transaksi</option>
            <option value="SALE">Hanya Penjualan</option>
            <option value="PURCHASE">Hanya Pembelian</option>
          </Select>
          <Input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Cari deskripsi..."
          />
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            placeholder="Dari tanggal"
          />
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            placeholder="Sampai tanggal"
          />
        </div>

        {history.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi tercatat"
            description="Mulai catat transaksi penjualan atau pengadaan barang di form atas."
          />
        ) : (
          <Table
            headers={['Tanggal', 'Jenis', 'Deskripsi', 'Kuantitas Item', 'Nominal', 'Penanggung Jawab', 'Aksi']}
          >
            {history.map((t) => {
              const emp = data.employees.find((x) => x.id === t.responsibleEmployeeId)
              const hasItems = Array.isArray(t.items) && t.items.length > 0
              const expanded = Boolean(expandedIds[t.id])

              return (
                <Fragment key={t.id}>
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold',
                          t.type === 'SALE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                        ].join(' ')}
                      >
                        {t.type === 'SALE' ? 'Penjualan' : 'Pembelian'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {t.description}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {hasItems ? `${t.items!.length} SKU` : 'Biaya Kas'}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {formatIDR(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {emp?.name ?? t.responsibleEmployeeId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {hasItems && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setExpandedIds((prev) => ({
                                ...prev,
                                [t.id]: !prev[t.id],
                              }))
                            }
                          >
                            {expanded ? 'Tutup' : 'Item'}
                          </Button>
                        )}
                        {canDeleteHistory && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700"
                            onClick={() => deleteTransaction(t.id)}
                            disabled={deletingTransactionId === t.id}
                          >
                            Hapus
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Items Drawer */}
                  {expanded && hasItems && (
                    <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                      <td colSpan={7} className="px-6 py-3">
                        <div className="rounded-lg border border-slate-200/80 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                          <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Rincian SKU Transaksi #{t.id}:
                          </div>
                          <div className="space-y-1 font-mono text-slate-600 dark:text-slate-400">
                            {t.items!.map((it, i) => {
                              const p = data.products.find((prod) => prod.id === it.productId)
                              return (
                                <div key={i} className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1">
                                  <span>
                                    {p?.name ?? it.productId} × {it.quantity} unit
                                  </span>
                                  <span>
                                    @{formatIDR(it.unitPrice)} = {formatIDR(it.quantity * it.unitPrice)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}
