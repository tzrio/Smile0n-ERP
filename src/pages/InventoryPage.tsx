/**
 * Inventory (stok & produk) page for Smile0n ERP:
 * - Multi-division support: Wall Decor & Bakery/Food
 * - Reseller workflow friendly (Direct Purchase -> Sale without production)
 * - Professional clean UI/UX
 */
import { useEffect, useMemo, useState } from 'react'
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
import { computeProductStock } from '../domain/selectors'
import type { BusinessDivision, ProductKind, StockMovementType } from '../data/types'
import { isoNow, formatDate } from '../utils/date'
import { downloadCsv } from '../utils/csv'
import { useToast } from '../app/ToastContext'
import { useAuth } from '../auth/AuthContext'

function productKindLabel(kind: ProductKind) {
  if (kind === 'FINISHED') return 'Barang Siap Jual'
  if (kind === 'RAW_MATERIAL') return 'Bahan Mentah'
  return 'Lainnya'
}

export function InventoryPage() {
  const data = useAppData()
  const toast = useToast()
  const auth = useAuth()
  const { division } = useDivision()

  const canDeleteHistory = auth.hasRole(['CEO', 'CTO', 'CMO'])

  const [productSearch, setProductSearch] = useState('')
  const [productKindFilter, setProductKindFilter] = useState<'ALL' | ProductKind>('ALL')

  // Filter products by global division if active
  const scopedProducts = useMemo(() => {
    if (division === 'ALL') return data.products
    return data.products.filter((p) => p.division === division)
  }, [data.products, division])

  const stockRows = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    const productIds = new Set(scopedProducts.map((p) => p.id))
    const rows = computeProductStock(data, { productIds })
    const filteredByKind =
      productKindFilter === 'ALL' ? rows : rows.filter((r) => r.product.kind === productKindFilter)
    const filtered = q
      ? filteredByKind.filter((r) => r.product.name.toLowerCase().includes(q))
      : filteredByKind
    return filtered.slice().sort((a, b) => a.product.name.localeCompare(b.product.name))
  }, [data, productKindFilter, productSearch, scopedProducts])

  // Form New Product
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('')
  const [productDivision, setProductDivision] = useState<BusinessDivision>(
    division === 'FOOD' ? 'FOOD' : 'WALL_DECOR'
  )
  const [productKind, setProductKind] = useState<ProductKind>('FINISHED')

  // Keep division state synced with global filter if active
  useEffect(() => {
    if (division === 'FOOD') {
      setProductDivision('FOOD')
      setCategory('Roti & Bakery')
      setProductKind('FINISHED')
    } else if (division === 'WALL_DECOR') {
      setProductDivision('WALL_DECOR')
      setCategory('Kayu')
    }
  }, [division])

  // Form Stock Movement
  const [movementProductId, setMovementProductId] = useState(scopedProducts[0]?.id ?? '')
  const [movementType, setMovementType] = useState<StockMovementType>('IN')
  const [movementQty, setMovementQty] = useState(1)
  const [movementDate, setMovementDate] = useState(() => formatDate(isoNow()))
  const [movementEmployeeId, setMovementEmployeeId] = useState(data.employees[0]?.id ?? '')

  const [error, setError] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editingProductName, setEditingProductName] = useState('')

  const [movementSearch, setMovementSearch] = useState('')
  const [movementFilterProductId, setMovementFilterProductId] = useState('ALL')
  const [movementFilterFrom, setMovementFilterFrom] = useState('')
  const [movementFilterTo, setMovementFilterTo] = useState('')

  const [savingProduct, setSavingProduct] = useState(false)
  const [savingMovement, setSavingMovement] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  const [deletingMovementId, setDeletingMovementId] = useState<string | null>(null)

  const filteredMovements = useMemo(() => {
    const q = movementSearch.trim().toLowerCase()
    const fromTs = movementFilterFrom ? new Date(movementFilterFrom).getTime() : Number.NEGATIVE_INFINITY
    const toTs = movementFilterTo ? new Date(movementFilterTo).getTime() + 86_399_999 : Number.POSITIVE_INFINITY
    const validProductIds = new Set(scopedProducts.map((p) => p.id))

    return data.stockMovements
      .filter((m) => {
        if (!validProductIds.has(m.productId)) return false
        if (movementFilterProductId !== 'ALL' && m.productId !== movementFilterProductId) return false
        const mTs = new Date(m.date).getTime()
        if (!Number.isNaN(mTs)) {
          if (mTs < fromTs) return false
          if (mTs > toTs) return false
        }
        if (!q) return true
        const p = data.products.find((x) => x.id === m.productId)
        const emp = data.employees.find((x) => x.id === m.responsibleEmployeeId)
        const hay = `${p?.name ?? m.productId} ${emp?.name ?? ''} ${m.type}`.toLowerCase()
        return hay.includes(q)
      })
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [
    data.employees,
    data.products,
    data.stockMovements,
    movementFilterFrom,
    movementFilterProductId,
    movementFilterTo,
    movementSearch,
    scopedProducts,
  ])

  function exportStockSummaryCsv() {
    const rows = stockRows
    const filename = `stok-ringkasan-${new Date(isoNow()).toISOString().slice(0, 10)}`
    downloadCsv(filename, rows, [
      { header: 'Divisi', value: (r) => r.product.division ?? 'WALL_DECOR' },
      { header: 'Produk', value: (r) => r.product.name },
      { header: 'Kategori', value: (r) => r.product.category },
      { header: 'Keterangan', value: (r) => r.product.kind },
      { header: 'Stok Masuk', value: (r) => r.stockIn },
      { header: 'Stok Keluar', value: (r) => r.stockOut },
      { header: 'Sisa Stok', value: (r) => r.remaining },
    ])
    toast.success('CSV ringkasan stok berhasil diexport')
  }

  function exportStockMovementsCsv() {
    const rows = filteredMovements
    const filename = `stok-mutasi-${new Date(isoNow()).toISOString().slice(0, 10)}`
    downloadCsv(filename, rows, [
      { header: 'Tanggal', value: (m) => m.date },
      {
        header: 'Produk',
        value: (m) => data.products.find((p) => p.id === m.productId)?.name ?? m.productId,
      },
      { header: 'Jenis', value: (m) => m.type },
      { header: 'Qty', value: (m) => m.quantity },
      {
        header: 'Penanggung Jawab',
        value: (m) => data.employees.find((e) => e.id === m.responsibleEmployeeId)?.name ?? m.responsibleEmployeeId,
      },
      { header: 'Source', value: (m) => m.sourceType ?? 'MANUAL' },
    ])
    toast.success('CSV mutasi stok berhasil diexport')
  }

  useEffect(() => {
    if (movementProductId && scopedProducts.some((p) => p.id === movementProductId)) return
    setMovementProductId(scopedProducts[0]?.id ?? '')
  }, [scopedProducts, movementProductId])

  useEffect(() => {
    if (movementEmployeeId && data.employees.some((e) => e.id === movementEmployeeId)) return
    setMovementEmployeeId(data.employees[0]?.id ?? '')
  }, [data.employees, movementEmployeeId])

  async function addProduct() {
    setError(null)
    setSavingProduct(true)
    try {
      if (!productName.trim() || !category.trim()) {
        setError('Nama produk dan kategori wajib diisi')
        return
      }
      const p = await Promise.resolve(
        (repo as any).products.create({
          name: productName.trim(),
          category: category.trim(),
          kind: productKind,
          division: productDivision,
        })
      )
      setProductName('')
      if (division === 'ALL') setCategory('')
      setMovementProductId(p.id)
      toast.success('Produk baru berhasil didaftarkan')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menambah produk'
      setError(msg)
      toast.error(msg)
    } finally {
      setSavingProduct(false)
    }
  }

  async function addMovement() {
    setError(null)
    setSavingMovement(true)
    try {
      if (!movementProductId) {
        setError('Pilih produk terlebih dahulu')
        return
      }
      if (!movementEmployeeId) {
        setError('Pilih penanggung jawab')
        return
      }
      if (movementQty <= 0) {
        setError('Kuantitas harus lebih dari 0')
        return
      }
      const dateIso = new Date(movementDate).toISOString()
      await Promise.resolve(
        (repo as any).stockMovements.create({
          productId: movementProductId,
          type: movementType,
          quantity: movementQty,
          date: dateIso,
          responsibleEmployeeId: movementEmployeeId,
          sourceType: 'MANUAL',
        })
      )
      toast.success('Pergerakan stok tersimpan')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal mencatat mutasi stok'
      setError(msg)
      toast.error(msg)
    } finally {
      setSavingMovement(false)
    }
  }

  async function deleteProduct(productId: string, productNameLabel: string) {
    setError(null)
    setDeletingProductId(productId)
    try {
      const ok = window.confirm(
        `Hapus produk "${productNameLabel}"? Semua log mutasi produk ini juga akan terhapus.`
      )
      if (!ok) return
      await Promise.resolve((repo as any).products.remove(productId))
      toast.success('Produk berhasil dihapus')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus produk'
      setError(msg)
      toast.error(msg)
    } finally {
      setDeletingProductId(null)
    }
  }

  async function startEditProduct(productId: string) {
    const current = data.products.find((p) => p.id === productId)
    if (!current) return
    setEditingProductId(productId)
    setEditingProductName(current.name)
  }

  async function saveEditProduct(productId: string) {
    setError(null)
    setSavingProduct(true)
    try {
      const nextName = editingProductName.trim()
      if (!nextName) {
        setError('Nama produk wajib diisi')
        return
      }
      await Promise.resolve((repo as any).products.update(productId, { name: nextName }))
      toast.success('Nama produk diperbarui')
      setEditingProductId(null)
      setEditingProductName('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal memperbarui produk'
      setError(msg)
      toast.error(msg)
    } finally {
      setSavingProduct(false)
    }
  }

  async function deleteMovement(movementId: string) {
    setError(null)
    if (!canDeleteHistory) {
      const msg = 'Hanya pimpinan (CEO/CTO/CMO) yang berhak menghapus riwayat stok'
      setError(msg)
      toast.error(msg)
      return
    }
    setDeletingMovementId(movementId)
    try {
      const ok = window.confirm('Hapus baris pergerakan stok ini?')
      if (!ok) return
      await Promise.resolve((repo as any).stockMovements.remove(movementId))
      toast.success('Riwayat stok dihapus')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus mutasi stok'
      setError(msg)
      toast.error(msg)
    } finally {
      setDeletingMovementId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Katalog & Manajemen Stok"
        subtitle="Kelola SKU barang jadi, bahan baku kerajinan, dan stok reseller makanan."
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={exportStockSummaryCsv}
              disabled={stockRows.length === 0}
            >
              Export Stok
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={exportStockMovementsCsv}
              disabled={filteredMovements.length === 0}
            >
              Export Mutasi
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Forms Section */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Tambah SKU Produk */}
        <Card
          title="Tambah Katalog / SKU Baru"
          description={
            productDivision === 'FOOD'
              ? 'Pendaftaran stok siap jual untuk reseller makanan (misal: Garlic Bread / Chocolate Bread).'
              : 'Pendaftaran bahan baku atau barang jadi hiasan dinding (Wall Decor).'
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Divisi Bisnis
              </label>
              <div className="mt-1">
                <Select
                  value={productDivision}
                  onChange={(e) => setProductDivision(e.target.value as BusinessDivision)}
                >
                  <option value="WALL_DECOR">Wall Decor (Hiasan Dinding & Craft)</option>
                  <option value="FOOD">Food & Bakery (Garlic/Choco Bread Reseller)</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nama Produk
              </label>
              <div className="mt-1">
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={productDivision === 'FOOD' ? 'Contoh: Garlic Bread Crispy' : 'Contoh: Macrame Daun'}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Kategori
              </label>
              <div className="mt-1">
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={productDivision === 'FOOD' ? 'Roti & Bakery' : 'Kayu / Benang / Pigura'}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Tipe Barang
              </label>
              <div className="mt-1">
                <Select
                  value={productKind}
                  onChange={(e) => setProductKind(e.target.value as ProductKind)}
                >
                  <option value="FINISHED">Barang Siap Jual (Retail / Reseller)</option>
                  {productDivision === 'WALL_DECOR' && (
                    <option value="RAW_MATERIAL">Bahan Mentah Produksi (Kayu, Kain, Tali)</option>
                  )}
                  <option value="OTHER">Lainnya / Perlengkapan Packaging</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Button type="button" onClick={addProduct} disabled={savingProduct}>
              {savingProduct ? 'Menyimpan...' : 'Simpan Produk Baru'}
            </Button>
          </div>
        </Card>

        {/* Catat Mutasi Manual */}
        <Card
          title="Catat Mutasi Stok Manual"
          description="Gunakan ini untuk penyesuaian opname, bonus supplier, atau barang rusak."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Pilih Produk
              </label>
              <div className="mt-1">
                <Select
                  value={movementProductId}
                  onChange={(e) => setMovementProductId(e.target.value)}
                >
                  {scopedProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.division === 'FOOD' ? 'Food' : 'Decor'}] {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Arah Mutasi
              </label>
              <div className="mt-1">
                <Select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as StockMovementType)}
                >
                  <option value="IN">Stok Masuk (+)</option>
                  <option value="OUT">Stok Keluar (-)</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Jumlah (Qty)
              </label>
              <div className="mt-1">
                <Input
                  type="number"
                  min={1}
                  value={movementQty}
                  onChange={(e) => setMovementQty(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Tanggal Mutasi
              </label>
              <div className="mt-1">
                <Input
                  type="date"
                  value={movementDate}
                  onChange={(e) => setMovementDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Penanggung Jawab
              </label>
              <div className="mt-1">
                <Select
                  value={movementEmployeeId}
                  onChange={(e) => setMovementEmployeeId(e.target.value)}
                >
                  {data.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.position})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Button type="button" onClick={addMovement} disabled={savingMovement}>
              {savingMovement ? 'Menyimpan...' : 'Simpan Mutasi'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Ringkasan Stok Table */}
      <Card
        title="Posisi Stok & Ketersediaan Barang"
        description="Data stok terkini yang dihitung otomatis dari mutasi, transaksi pembelian, dan produksi."
        right={
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {stockRows.length} Produk Tercatat
          </span>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Cari nama produk..."
          />
          <Select
            value={productKindFilter}
            onChange={(e) => setProductKindFilter(e.target.value as any)}
          >
            <option value="ALL">Semua Jenis Barang</option>
            <option value="FINISHED">Barang Siap Jual</option>
            <option value="RAW_MATERIAL">Bahan Mentah Produksi</option>
            <option value="OTHER">Lainnya</option>
          </Select>
        </div>

        {stockRows.length === 0 ? (
          <EmptyState
            title="Tidak ada produk ditemukan"
            description="Tambahkan produk baru di form atas atau ganti filter divisi usaha."
          />
        ) : (
          <Table headers={['Divisi', 'Nama Produk', 'Kategori', 'Status Tipe', 'Masuk', 'Keluar', 'Sisa Stok', 'Opsi']}>
            {stockRows.map((r) => (
              <tr key={r.product.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <span
                    className={[
                      'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold',
                      r.product.division === 'FOOD'
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20 dark:bg-indigo-950/40 dark:text-indigo-300',
                    ].join(' ')}
                  >
                    {r.product.division === 'FOOD' ? 'Food & Bread' : 'Wall Decor'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  {editingProductId === r.product.id ? (
                    <Input
                      value={editingProductName}
                      onChange={(e) => setEditingProductName(e.target.value)}
                    />
                  ) : (
                    r.product.name
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.product.category}</td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {productKindLabel(r.product.kind)}
                </td>
                <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                  +{r.stockIn}
                </td>
                <td className="px-4 py-3 font-mono text-rose-600 dark:text-rose-400">
                  -{r.stockOut}
                </td>
                <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                  <span
                    className={[
                      'inline-block min-w-8 text-center rounded px-2 py-0.5 text-xs',
                      r.remaining > 5
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : r.remaining > 0
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                    ].join(' ')}
                  >
                    {r.remaining} unit
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {editingProductId === r.product.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void saveEditProduct(r.product.id)}
                          disabled={savingProduct}
                        >
                          Simpan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingProductId(null)
                            setEditingProductName('')
                          }}
                        >
                          Batal
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void startEditProduct(r.product.id)}
                      >
                        Ubah
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => deleteProduct(r.product.id, r.product.name)}
                      disabled={deletingProductId === r.product.id || editingProductId === r.product.id}
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Audit Log Mutasi */}
      <Card
        title="Riwayat Audit Mutasi Stok"
        description="Log pergerakan barang otomatis dari transaksi, proses produksi, atau penyesuaian manual."
      >
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Select
            value={movementFilterProductId}
            onChange={(e) => setMovementFilterProductId(e.target.value)}
          >
            <option value="ALL">Semua Produk</option>
            {scopedProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={movementFilterFrom}
            onChange={(e) => setMovementFilterFrom(e.target.value)}
            placeholder="Dari tanggal"
          />
          <Input
            type="date"
            value={movementFilterTo}
            onChange={(e) => setMovementFilterTo(e.target.value)}
            placeholder="Sampai tanggal"
          />
          <Input
            value={movementSearch}
            onChange={(e) => setMovementSearch(e.target.value)}
            placeholder="Cari mutasi..."
          />
        </div>

        {filteredMovements.length === 0 ? (
          <EmptyState
            title="Tidak ada riwayat mutasi"
            description="Riwayat akan tercatat saat ada pembelian, penjualan, atau mutasi manual."
          />
        ) : (
          <Table
            headers={
              canDeleteHistory
                ? ['Tanggal', 'Produk', 'Arah', 'Qty', 'Penanggung Jawab', 'Sumber Log', 'Aksi']
                : ['Tanggal', 'Produk', 'Arah', 'Qty', 'Penanggung Jawab', 'Sumber Log']
            }
          >
            {filteredMovements.map((m) => {
              const p = data.products.find((x) => x.id === m.productId)
              const emp = data.employees.find((x) => x.id === m.responsibleEmployeeId)
              return (
                <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{formatDate(m.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {p?.name ?? m.productId}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold',
                        m.type === 'IN'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                      ].join(' ')}
                    >
                      {m.type === 'IN' ? '+ Masuk' : '- Keluar'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {m.quantity}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {emp?.name ?? m.responsibleEmployeeId}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {m.sourceType ?? 'MANUAL'}
                    </span>
                  </td>
                  {canDeleteHistory && (
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                        onClick={() => void deleteMovement(m.id)}
                        disabled={deletingMovementId === m.id}
                      >
                        Hapus
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}
