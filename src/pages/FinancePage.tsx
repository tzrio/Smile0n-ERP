/**
 * Finance summary page:
 * - Aggregates sales/purchases into profit and cash balance
 * - Filterable by global business division (Wall Decor / Food / All)
 * - Monthly analytics chart + daily breakdown table + export CSV
 */
import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Select } from '../components/Select'
import { Table } from '../components/Table'
import { EmptyState } from '../components/EmptyState'
import { PeriodSelector } from '../components/PeriodSelector'
import { useAppData } from '../data/useAppData'
import { useDivision } from '../app/DivisionContext'
import {
  computeFinanceSummary,
  computePeriodAnalytics,
  computeDailyFinance,
} from '../domain/selectors'
import type { ChartPeriod } from '../domain/selectors'
import { isoNow } from '../utils/date'
import { formatIDR } from '../utils/money'
import { downloadCsv } from '../utils/csv'
import { formatPeriodLabel } from '../utils/date'
import { MonthlyLineChart } from '../components/charts/MonthlyLineChart'
import { useSortableTable } from '../hooks/useSortableTable'

export function FinancePage() {
  const data = useAppData()
  const { division } = useDivision()

  const scopedProducts = useMemo(() => {
    if (division === 'ALL') return data.products
    return data.products.filter((p) => p.division === division)
  }, [data.products, division])

  const productIds = useMemo(
    () => (division === 'ALL' ? undefined : new Set(scopedProducts.map((p) => p.id))),
    [division, scopedProducts]
  )

  const finance = useMemo(() => computeFinanceSummary(data, { productIds }), [data, productIds])
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('weekly')
  const periodAnalytics = useMemo(
    () => computePeriodAnalytics(data, chartPeriod, { productIds }),
    [data, chartPeriod, productIds]
  )
  const dailyRows = useMemo(() => computeDailyFinance(data, { productIds }), [data, productIds])

  // Daily table filters
  const [dailyFilterFrom, setDailyFilterFrom] = useState('')
  const [dailyFilterTo, setDailyFilterTo] = useState('')
  const [dailyFilterType, setDailyFilterType] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL')
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const filteredDailyRows = useMemo(() => {
    return dailyRows.filter((row) => {
      if (dailyFilterFrom && row.date < dailyFilterFrom) return false
      if (dailyFilterTo && row.date > dailyFilterTo) return false
      if (dailyFilterType === 'PROFIT' && row.profit <= 0) return false
      if (dailyFilterType === 'LOSS' && row.profit >= 0) return false
      return true
    })
  }, [dailyRows, dailyFilterFrom, dailyFilterTo, dailyFilterType])

  const { sortState: dailySortState, toggleSort: dailyToggleSort, sorted: sortedDailyRows } = useSortableTable(
    filteredDailyRows,
    {
      defaultKey: 'date',
      defaultDir: 'desc',
      getValue: (row, key) => {
        if (key === 'date') return row.date
        if (key === 'sales') return row.sales
        if (key === 'purchases') return row.purchases
        if (key === 'profit') return row.profit
        if (key === 'cash') return row.cumulativeCash
        return ''
      },
    }
  )

  function exportFinanceCsv() {
    const filename = `laporan-keuangan-${division.toLowerCase()}-${new Date(isoNow()).toISOString().slice(0, 10)}`

    const rows = [
      {
        period: 'TOTAL KONSOLIDASI',
        sales: finance.totalSales,
        purchases: finance.totalPurchases,
        profit: finance.profit,
        cashOpeningBalance: data.settings.cashOpeningBalance,
        cashBalance: finance.cashBalance,
      },
      ...periodAnalytics.keys.map((k) => {
        const sales = periodAnalytics.sales.find((p) => p.month === k)?.value ?? 0
        const purchases = periodAnalytics.purchases.find((p) => p.month === k)?.value ?? 0
        return {
          period: k,
          sales,
          purchases,
          profit: sales - purchases,
          cashOpeningBalance: '',
          cashBalance: '',
        }
      }),
    ]

    downloadCsv(filename, rows, [
      { header: 'Periode', value: (r) => r.period },
      { header: 'Total Penjualan', value: (r) => r.sales },
      { header: 'Total Pembelian', value: (r) => r.purchases },
      { header: 'Laba / Rugi Bersih', value: (r) => r.profit },
      { header: 'Saldo Pembukaan', value: (r) => r.cashOpeningBalance },
      { header: 'Saldo Kas', value: (r) => r.cashBalance },
    ])
  }

  function exportDailyCsv() {
    const filename = `laporan-harian-${division.toLowerCase()}-${new Date(isoNow()).toISOString().slice(0, 10)}`

    // Flatten each day's transactions into individual rows
    const rows: { tanggal: string; jenis: string; deskripsi: string; nominal: number; laba_rugi_hari: number; saldo_kumulatif: number }[] = []
    for (const day of sortedDailyRows) {
      for (const t of day.transactions) {
        rows.push({
          tanggal: day.date,
          jenis: t.type === 'SALE' ? 'Penjualan' : 'Pembelian',
          deskripsi: t.description,
          nominal: t.amount,
          laba_rugi_hari: day.profit,
          saldo_kumulatif: day.cumulativeCash,
        })
      }
    }

    downloadCsv(filename, rows, [
      { header: 'Tanggal', value: (r) => r.tanggal },
      { header: 'Jenis', value: (r) => r.jenis },
      { header: 'Deskripsi', value: (r) => r.deskripsi },
      { header: 'Nominal (IDR)', value: (r) => r.nominal },
      { header: 'L/R Hari', value: (r) => r.laba_rugi_hari },
      { header: 'Saldo Kumulatif', value: (r) => r.saldo_kumulatif },
    ])
  }

  const divisionLabel =
    division === 'ALL'
      ? 'Konsolidasi Semua Divisi'
      : division === 'FOOD'
      ? 'Divisi Reseller Makanan'
      : 'Divisi Kerajinan Wall Decor'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Arus Kas & Laba Rugi"
        subtitle={`Pembukuan performa kas keuangan Smile0n (${divisionLabel}).`}
        badge={
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            {division === 'ALL' ? 'Semua Divisi' : division === 'FOOD' ? 'Reseller Food' : 'Wall Decor'}
          </span>
        }
        right={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={exportDailyCsv}
              disabled={dailyRows.length === 0}
            >
              Export Harian
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={exportFinanceCsv}
              disabled={data.transactions.length === 0}
            >
              Export Bulanan
            </Button>
          </div>
        }
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Penjualan"
          value={formatIDR(finance.totalSales)}
          trend="Omzet"
          hint="Akumulasi penerimaan kas penjualan"
        />
        <StatCard
          label="Total Pembelian"
          value={formatIDR(finance.totalPurchases)}
          hint="HPP kulakan & pengadaan stok"
        />
        <StatCard
          label="Laba / Rugi Operasional"
          value={formatIDR(finance.profit)}
          trend={finance.profit >= 0 ? '+ Untung' : '- Rugi'}
          hint="Omzet Penjualan - Biaya Pembelian"
        />
        <StatCard
          label="Posisi Kas Saat Ini"
          value={formatIDR(finance.cashBalance)}
          hint="Saldo awal pembukaan + akumulasi laba"
        />
      </div>

      {/* Monthly chart */}
      <Card
        title="Grafik Tren Penjualan vs Pembelian"
        description="Analisis performa keuangan untuk memantau margin keuntungan."
        right={<PeriodSelector value={chartPeriod} onChange={setChartPeriod} />}
      >
        <MonthlyLineChart
          months={periodAnalytics.keys.map((k) => formatPeriodLabel(k, chartPeriod))}
          series={[
            { label: 'Penjualan (IDR)', data: periodAnalytics.sales.map((p) => p.value) },
            { label: 'Pembelian / Kulakan (IDR)', data: periodAnalytics.purchases.map((p) => p.value) },
          ]}
        />
      </Card>

      {/* Daily breakdown table */}
      <Card
        title="Rincian Laporan Harian"
        description="Breakdown penjualan, pembelian, dan laba/rugi per hari. Klik baris untuk lihat detail transaksi."
        right={
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {filteredDailyRows.length} hari
          </span>
        }
      >
        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            type="date"
            value={dailyFilterFrom}
            onChange={(e) => setDailyFilterFrom(e.target.value)}
            placeholder="Dari tanggal"
          />
          <Input
            type="date"
            value={dailyFilterTo}
            onChange={(e) => setDailyFilterTo(e.target.value)}
            placeholder="Sampai tanggal"
          />
          <Select
            value={dailyFilterType}
            onChange={(e) => setDailyFilterType(e.target.value as any)}
          >
            <option value="ALL">Semua Hari</option>
            <option value="PROFIT">Hanya Hari Untung</option>
            <option value="LOSS">Hanya Hari Rugi</option>
          </Select>
        </div>

        {sortedDailyRows.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi tercatat"
            description="Data harian akan muncul setelah ada transaksi pembelian atau penjualan."
          />
        ) : (
          <Table
            headers={[
              { label: 'Tanggal', sortKey: 'date' },
              { label: 'Penjualan', sortKey: 'sales' },
              { label: 'Pembelian', sortKey: 'purchases' },
              { label: 'Laba / Rugi', sortKey: 'profit' },
              { label: 'Saldo Kumulatif', sortKey: 'cash' },
              'Transaksi',
              'Detail',
            ]}
            sortState={dailySortState}
            onSort={dailyToggleSort}
          >
            {sortedDailyRows.map((row) => {
              const expanded = Boolean(expandedDays[row.date])
              const isProfit = row.profit > 0
              const isLoss = row.profit < 0

              return (
                <>
                  <tr
                    key={row.date}
                    className={[
                      'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors',
                      expanded ? 'bg-slate-50/60 dark:bg-slate-800/30' : '',
                    ].join(' ')}
                    onClick={() =>
                      setExpandedDays((prev) => ({ ...prev, [row.date]: !prev[row.date] }))
                    }
                  >
                    {/* Tanggal */}
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(row.date + 'T00:00:00').toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Penjualan */}
                    <td className="px-4 py-3 font-mono text-emerald-700 dark:text-emerald-400">
                      {row.sales > 0 ? formatIDR(row.sales) : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Pembelian */}
                    <td className="px-4 py-3 font-mono text-rose-600 dark:text-rose-400">
                      {row.purchases > 0 ? formatIDR(row.purchases) : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Laba/Rugi */}
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'inline-flex items-center rounded px-2 py-0.5 text-xs font-bold font-mono',
                          isProfit
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : isLoss
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                        ].join(' ')}
                      >
                        {isProfit ? '+' : ''}{formatIDR(row.profit)}
                      </span>
                    </td>

                    {/* Saldo kumulatif */}
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatIDR(row.cumulativeCash)}
                    </td>

                    {/* Jumlah transaksi */}
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {row.transactions.length} transaksi
                    </td>

                    {/* Toggle detail */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400 dark:text-slate-500 select-none">
                        {expanded ? '▲ Tutup' : '▼ Lihat'}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded — detail transaksi hari itu */}
                  {expanded && (
                    <tr key={`${row.date}-detail`} className="bg-slate-50/80 dark:bg-slate-800/20">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="rounded-lg border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Detail Transaksi —{' '}
                              {new Date(row.date + 'T00:00:00').toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                            <div className="flex gap-3 text-xs font-mono">
                              {row.sales > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  Masuk: +{formatIDR(row.sales)}
                                </span>
                              )}
                              {row.purchases > 0 && (
                                <span className="text-rose-600 dark:text-rose-400">
                                  Keluar: -{formatIDR(row.purchases)}
                                </span>
                              )}
                            </div>
                          </div>

                          <table className="min-w-full text-xs divide-y divide-slate-100 dark:divide-slate-800">
                            <thead className="bg-slate-50/60 dark:bg-slate-900/60">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Jenis</th>
                                <th className="px-4 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Deskripsi</th>
                                <th className="px-4 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                                <th className="px-4 py-2 text-right font-semibold text-slate-500 uppercase tracking-wider">Nominal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                              {row.transactions
                                .slice()
                                .sort((a, b) => {
                                  const ta = new Date(a.createdAt ?? a.date).getTime()
                                  const tb = new Date(b.createdAt ?? b.date).getTime()
                                  return ta - tb
                                })
                                .map((t) => {
                                  const emp = data.employees.find((e) => e.id === t.responsibleEmployeeId)
                                  const hasItems = Array.isArray(t.items) && t.items.length > 0
                                  return (
                                    <tr key={t.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                                      <td className="px-4 py-2.5">
                                        <span
                                          className={[
                                            'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold',
                                            t.type === 'SALE'
                                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                                          ].join(' ')}
                                        >
                                          {t.type === 'SALE' ? '↑ Penjualan' : '↓ Pembelian'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                                        <div>{t.description}</div>
                                        {emp && (
                                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                                            oleh {emp.name}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                                        {hasItems ? (
                                          <div className="space-y-0.5">
                                            {t.items!.map((it, i) => {
                                              const p = data.products.find((pr) => pr.id === it.productId)
                                              return (
                                                <div key={i} className="font-mono">
                                                  {p?.name ?? it.productId} ×{it.quantity} @{formatIDR(it.unitPrice)}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        ) : (
                                          <span className="italic text-slate-400">Kas / Jasa</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-mono font-semibold">
                                        <span
                                          className={
                                            t.type === 'SALE'
                                              ? 'text-emerald-700 dark:text-emerald-400'
                                              : 'text-rose-600 dark:text-rose-400'
                                          }
                                        >
                                          {t.type === 'SALE' ? '+' : '-'}{formatIDR(t.amount)}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                            {/* Day summary footer */}
                            <tfoot className="bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                  Hasil Hari Ini
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-sm">
                                  <span
                                    className={
                                      isProfit
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : isLoss
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-slate-500'
                                    }
                                  >
                                    {isProfit ? '+' : ''}{formatIDR(row.profit)}
                                  </span>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}
