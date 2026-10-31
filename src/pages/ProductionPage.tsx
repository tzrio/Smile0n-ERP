/**
 * Production page:
 * Dedicated to Wall Decor division crafting (Bahan Mentah -> Barang Jadi)
 * Friendly explanation for Food Reseller division where production is skipped.
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
import type { Product } from '../data/types'
import { computeProductStock } from '../domain/selectors'
import { formatDate, isoNow } from '../utils/date'
import { downloadCsv } from '../utils/csv'
import { useToast } from '../app/ToastContext'
import { useAuth } from '../auth/AuthContext'

function byName(a: Product, b: Product) {
  return a.name.localeCompare(b.name)
}

export function ProductionPage() {
  const data = useAppData()
  const toast = useToast()
  const auth = useAuth()
  const { division } = useDivision()

  const canDeleteHistory = auth.hasRole(['CEO', 'CTO', 'CMO'])

  // Wall decor products for craft conversion
  const rawProducts = useMemo(
    () =>
      data.products
        .filter((p) => p.kind === 'RAW_MATERIAL')
        .slice()
        .sort(byName),
    [data.products]
  )
  const finishedProducts = useMemo(
    () =>
      data.products
        .filter((p) => p.kind === 'FINISHED' && p.division !== 'FOOD')
        .slice()
        .sort(byName),
    [data.products]
  )

  const stockRows = useMemo(() => computeProductStock(data), [data])
  const remainingByProductId = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of stockRows) map.set(r.product.id, r.remaining)
    return map
  }, [stockRows])

  const [rawProductId, setRawProductId] = useState(rawProducts[0]?.id ?? '')
  const [rawQuantity, setRawQuantity] = useState(1)
  const [finishedProductId, setFinishedProductId] = useState(finishedProducts[0]?.id ?? '')
  const [finishedQuantity, setFinishedQuantity] = useState(1)
  const [date, setDate] = useState(() => formatDate(isoNow()))
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState(data.employees[0]?.id ?? '')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingProductionId, setDeletingProductionId] = useState<string | null>(null)

  useEffect(() => {
    if (rawProductId && rawProducts.some((p) => p.id === rawProductId)) return
    setRawProductId(rawProducts[0]?.id ?? '')
  }, [rawProducts, rawProductId])

  useEffect(() => {
    if (finishedProductId && finishedProducts.some((p) => p.id === finishedProductId)) return
    setFinishedProductId(finishedProducts[0]?.id ?? '')
  }, [finishedProducts, finishedProductId])

  useEffect(() => {
    if (responsibleEmployeeId && data.employees.some((e) => e.id === responsibleEmployeeId)) return
    setResponsibleEmployeeId(data.employees[0]?.id ?? '')
  }, [data.employees, responsibleEmployeeId])

  const rawRemaining = remainingByProductId.get(rawProductId) ?? 0
  const finishedRemaining = remainingByProductId.get(finishedProductId) ?? 0

  const history = useMemo(() => {
    return data.productions
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [data.productions])

  function exportProductionsCsv() {
    const rows = history
    const filename = `produksi-${new Date(isoNow()).toISOString().slice(0, 10)}`

    downloadCsv(filename, rows, [
      { header: 'Tanggal', value: (p) => p.date },
      {
        header: 'Bahan Mentah',
        value: (p) => data.products.find((x) => x.id === p.rawProductId)?.name ?? p.rawProductId,
      },
      { header: 'Qty OUT', value: (p) => p.rawQuantity },
      {
        header: 'Barang Jadi',
        value: (p) => data.products.find((x) => x.id === p.finishedProductId)?.name ?? p.finishedProductId,
      },
      { header: 'Qty IN', value: (p) => p.finishedQuantity },
      {
        header: 'Penanggung Jawab',
        value: (p) => data.employees.find((x) => x.id === p.responsibleEmployeeId)?.name ?? p.responsibleEmployeeId,
      },
      { header: 'Catatan', value: (p) => p.notes ?? '' },
    ])

    toast.success('CSV produksi berhasil diexport')
  }

  async function addProduction() {
    setError(null)
    setSaving(true)
    try {
      if (!rawProductId) {
        setError('Pilih bahan mentah terlebih dulu')
        return
      }
      if (!finishedProductId) {
        setError('Pilih barang jadi hasil produksi')
        return
      }
      if (!responsibleEmployeeId) {
        setError('Pilih anggota penanggung jawab')
        return
      }
      if (rawQuantity <= 0 || finishedQuantity <= 0) {
        setError('Kuantitas bahan dan hasil harus > 0')
        return
      }
      const dateIso = new Date(date).toISOString()

      await Promise.resolve(
        (repo as any).productions.create({
          rawProductId,
          rawQuantity,
          finishedProductId,
          finishedQuantity,
          date: dateIso,
          responsibleEmployeeId,
          notes: notes.trim() ? notes.trim() : undefined,
        })
      )

      setNotes('')
      toast.success('Laporan produksi kerajinan tersimpan')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan produksi'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduction(id: string) {
    setError(null)
    if (!canDeleteHistory) {
      const msg = 'Hanya pimpinan (CEO/CTO/CMO) yang bisa menghapus riwayat produksi'
      setError(msg)
      toast.error(msg)
      return
    }

    setDeletingProductionId(id)
    try {
      const ok = window.confirm(
        'Hapus item riwayat produksi ini? Mutasi stok terkait (IN/OUT) akan otomatis dibatalkan.'
      )
      if (!ok) return
      await Promise.resolve((repo as any).productions.remove(id))
      toast.success('Riwayat produksi dihapus')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus riwayat produksi'
      setError(msg)
      toast.error(msg)
    } finally {
      setDeletingProductionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operasional Produksi (Wall Decor)"
        subtitle="Alur konversi bahan mentah menjadi barang jadi hiasan dinding yang siap kirim."
        right={
          <Button
            variant="secondary"
            size="sm"
            onClick={exportProductionsCsv}
            disabled={history.length === 0}
          >
            Export Laporan
          </Button>
        }
      />

      {/* Info notice for food reseller */}
      {division === 'FOOD' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex gap-3">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Divisi Makanan / Bakery adalah Reseller Langsung
              </h4>
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Untuk produk makanan (Garlic Bread & Chocolate Bread), Smile0n beroperasi dengan sistem{' '}
                <strong>beli langsung & jual kembali</strong> tanpa melalui proses perakitan/produksi. Pencatatan
                pembelian barang langsung menambah stok siap jual di menu <strong>Transaksi Kas</strong>.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Form Input */}
      <Card
        title="Catat Batch Produksi Kerajinan"
        description="Sistem akan otomatis mengurangi stok bahan mentah (OUT) dan menambah stok barang jadi (IN)."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Tanggal Produksi
            </label>
            <div className="mt-1">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Penanggung Jawab Produksi
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

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Bahan Mentah Digunakan (OUT)
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px]">
              <Select
                value={rawProductId}
                onChange={(e) => setRawProductId(e.target.value)}
                disabled={rawProducts.length === 0}
              >
                {rawProducts.length === 0 ? (
                  <option value="">Belum ada bahan mentah terdaftar</option>
                ) : (
                  rawProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </Select>
              <Input
                type="number"
                min={1}
                value={rawQuantity}
                onChange={(e) => setRawQuantity(Number(e.target.value))}
                placeholder="Qty"
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Sisa stok tersedia:{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {rawRemaining} unit
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Hasil Barang Jadi (IN)
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px]">
              <Select
                value={finishedProductId}
                onChange={(e) => setFinishedProductId(e.target.value)}
                disabled={finishedProducts.length === 0}
              >
                {finishedProducts.length === 0 ? (
                  <option value="">Belum ada barang jadi kerajinan</option>
                ) : (
                  finishedProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </Select>
              <Input
                type="number"
                min={1}
                value={finishedQuantity}
                onChange={(e) => setFinishedQuantity(Number(e.target.value))}
                placeholder="Qty"
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Sisa stok saat ini:{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {finishedRemaining} unit
              </span>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Catatan Pengerjaan (opsional)
            </label>
            <div className="mt-1">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Finishing vernis kayu, batch 3 pcs pajangan dinding"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button type="button" onClick={addProduction} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Laporan Produksi'}
          </Button>
        </div>
      </Card>

      {/* History Table */}
      <Card
        title="Riwayat Produksi Kerajinan"
        description="Daftar batch perakitan hiasan dinding yang telah selesai dikerjakan."
      >
        {history.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat produksi"
            description="Catat laporan produksi pertama Anda untuk mengonversi stok bahan mentah."
          />
        ) : (
          <Table
            headers={
              canDeleteHistory
                ? ['Tanggal', 'Bahan Terpakai', 'Qty OUT', 'Hasil Barang Jadi', 'Qty IN', 'Penanggung Jawab', 'Catatan', 'Aksi']
                : ['Tanggal', 'Bahan Terpakai', 'Qty OUT', 'Hasil Barang Jadi', 'Qty IN', 'Penanggung Jawab', 'Catatan']
            }
          >
            {history.map((p) => {
              const raw = data.products.find((x) => x.id === p.rawProductId)
              const fin = data.products.find((x) => x.id === p.finishedProductId)
              const emp = data.employees.find((x) => x.id === p.responsibleEmployeeId)
              return (
                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">
                    {raw?.name ?? p.rawProductId}
                  </td>
                  <td className="px-4 py-3 font-mono text-rose-600 dark:text-rose-400">
                    -{p.rawQuantity}
                  </td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">
                    {fin?.name ?? p.finishedProductId}
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                    +{p.finishedQuantity}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {emp?.name ?? p.responsibleEmployeeId}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                    {p.notes || '-'}
                  </td>
                  {canDeleteHistory && (
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                        onClick={() => void deleteProduction(p.id)}
                        disabled={deletingProductionId === p.id}
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
