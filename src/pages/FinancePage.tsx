/**
 * Finance summary page:
 * - Aggregates sales/purchases into profit and cash balance
 * - Filterable by global business division (Wall Decor / Food / All)
 * - Monthly analytics chart + export CSV
 */
import { useMemo } from 'react'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Button } from '../components/Button'
import { useAppData } from '../data/useAppData'
import { useDivision } from '../app/DivisionContext'
import { computeFinanceSummary, computeMonthlyAnalytics } from '../domain/selectors'
import { isoNow } from '../utils/date'
import { formatIDR } from '../utils/money'
import { downloadCsv } from '../utils/csv'
import { MonthlyLineChart } from '../components/charts/MonthlyLineChart'

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
  const analytics = useMemo(() => computeMonthlyAnalytics(data, 12, { productIds }), [data, productIds])

  function exportFinanceCsv() {
    const filename = `laporan-keuangan-${division.toLowerCase()}-${new Date(isoNow()).toISOString().slice(0, 10)}`

    const rows = [
      {
        month: 'TOTAL KONSOLIDASI',
        sales: finance.totalSales,
        purchases: finance.totalPurchases,
        profit: finance.profit,
        cashOpeningBalance: data.settings.cashOpeningBalance,
        cashBalance: finance.cashBalance,
      },
      ...analytics.months.map((m) => {
        const sales = analytics.sales.find((p) => p.month === m)?.value ?? 0
        const purchases = analytics.purchases.find((p) => p.month === m)?.value ?? 0
        return {
          month: m,
          sales,
          purchases,
          profit: sales - purchases,
          cashOpeningBalance: '',
          cashBalance: '',
        }
      }),
    ]

    downloadCsv(filename, rows, [
      { header: 'Periode Bulan', value: (r) => r.month },
      { header: 'Total Penjualan', value: (r) => r.sales },
      { header: 'Total Pembelian', value: (r) => r.purchases },
      { header: 'Laba / Rugi Bersih', value: (r) => r.profit },
      { header: 'Saldo Pembukaan', value: (r) => r.cashOpeningBalance },
      { header: 'Saldo Kas', value: (r) => r.cashBalance },
    ])
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Arus Kas & Laba Rugi"
        subtitle={`Pembukuan performa kas keuangan Smile0n (${
          division === 'ALL'
            ? 'Konsolidasi Semua Divisi'
            : division === 'FOOD'
            ? 'Divisi Reseller Makanan'
            : 'Divisi Kerajinan Wall Decor'
        }).`}
        badge={
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            {division === 'ALL' ? 'Semua Divisi' : division === 'FOOD' ? 'Reseller Food' : 'Wall Decor'}
          </span>
        }
        right={
          <Button
            variant="secondary"
            size="sm"
            onClick={exportFinanceCsv}
            disabled={data.transactions.length === 0}
          >
            Export Laporan Keuangan
          </Button>
        }
      />

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

      <Card
        title="Grafik Tren Penjualan vs Pembelian"
        description="Analisis performa keuangan 12 bulan terakhir untuk memantau margin keuntungan."
      >
        <MonthlyLineChart
          months={analytics.months}
          series={[
            { label: 'Penjualan (IDR)', data: analytics.sales.map((p) => p.value) },
            { label: 'Pembelian / Kulakan (IDR)', data: analytics.purchases.map((p) => p.value) },
          ]}
        />
      </Card>
    </div>
  )
}
