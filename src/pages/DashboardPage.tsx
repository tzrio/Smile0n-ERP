import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { MonthlyBarChart } from '../components/charts/MonthlyBarChart'
import { MonthlyLineChart } from '../components/charts/MonthlyLineChart'
import { PeriodSelector } from '../components/PeriodSelector'
import { useAppData } from '../data/useAppData'
import { useDivision } from '../app/DivisionContext'
import { computeFinanceSummary, computePeriodAnalytics, computeProductStock } from '../domain/selectors'
import type { ChartPeriod } from '../domain/selectors'
import { formatIDR } from '../utils/money'
import { formatPeriodLabel } from '../utils/date'

export function DashboardPage() {
  const data = useAppData()
  const { division } = useDivision()

  const [financePeriod, setFinancePeriod] = useState<ChartPeriod>('weekly')
  const [stockPeriod, setStockPeriod] = useState<ChartPeriod>('weekly')

  const filteredProducts = useMemo(() => {
    if (division === 'ALL') return data.products
    return data.products.filter((p) => p.division === division)
  }, [data.products, division])

  const filteredProductIds = useMemo(
    () => new Set(filteredProducts.map((p) => p.id)),
    [filteredProducts]
  )

  const finishedProductIds = useMemo(
    () => new Set(filteredProducts.filter((p) => p.kind === 'FINISHED').map((p) => p.id)),
    [filteredProducts]
  )

  const finance = useMemo(
    () => computeFinanceSummary(data, { productIds: division === 'ALL' ? undefined : filteredProductIds }),
    [data, division, filteredProductIds]
  )

  const financeAnalytics = useMemo(
    () => computePeriodAnalytics(data, financePeriod, { productIds: finishedProductIds }),
    [data, financePeriod, finishedProductIds]
  )

  const stockAnalytics = useMemo(
    () => computePeriodAnalytics(data, stockPeriod, { productIds: finishedProductIds }),
    [data, stockPeriod, finishedProductIds]
  )

  const stock = useMemo(
    () => computeProductStock(data, { productIds: finishedProductIds }),
    [data, finishedProductIds]
  )

  const totalEmployees = data.employees.length
  const totalFinishedSkus = stock.length
  const totalRemainingStock = stock.reduce((acc, r) => acc + r.remaining, 0)

  const divisionTitle =
    division === 'ALL'
      ? 'Konsolidasi Seluruh Usaha'
      : division === 'FOOD'
      ? 'Divisi Makanan & Reseller Bakery'
      : 'Divisi Kerajinan Wall Decor'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Overview"
        subtitle={`Ringkasan metriks operasional, performa kas, dan inventaris (${divisionTitle}).`}
        badge={
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            {division === 'ALL' ? 'Semua Divisi' : division === 'FOOD' ? 'F&B Reseller' : 'Wall Decor'}
          </span>
        }
      />

      {/* KPI Financial Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Penjualan"
          value={formatIDR(finance.totalSales)}
          trend="Pemasukan"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Total Pembelian"
          value={formatIDR(finance.totalPurchases)}
          hint="HPP & Pengadaan stok"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          }
        />
        <StatCard
          label="Laba Bersih"
          value={formatIDR(finance.profit)}
          trend={finance.profit >= 0 ? 'Surplus' : 'Defisit'}
          hint="Penjualan dikurangi pembelian"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="m22 7-8.5 8.5-5-5L2 17" />
              <path d="M16 7h6v6" />
            </svg>
          }
        />
        <StatCard
          label="Posisi Saldo Kas"
          value={formatIDR(finance.cashBalance)}
          hint="Saldo awal + akumulasi laba"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          }
        />
      </div>

      {/* Operational Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Unit Siap Jual"
          value={`${totalRemainingStock} unit`}
          hint={division === 'FOOD' ? 'Stok Garlic & Choco Bread tersedia' : 'Stok barang jadi siap dikirim'}
        />
        <StatCard
          label="Varian Produk (SKU)"
          value={`${totalFinishedSkus} SKU`}
          hint={division === 'ALL' ? 'Total katalog aktif' : `Katalog divisi ${division}`}
        />
        <StatCard
          label="Personel Aktif"
          value={`${totalEmployees} orang`}
          hint="Rakha (CEO), Roihan (CTO), Bagus (CMO)"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card
          title="Tren Finansial"
          description="Pergerakan omzet penjualan versus laba operasional bersih"
          right={
            <PeriodSelector value={financePeriod} onChange={setFinancePeriod} />
          }
        >
          <MonthlyLineChart
            months={financeAnalytics.keys.map((k) => formatPeriodLabel(k, financePeriod))}
            series={[
              { label: 'Penjualan (IDR)', data: financeAnalytics.sales.map((p) => p.value) },
              { label: 'Laba Bersih (IDR)', data: financeAnalytics.profit.map((p) => p.value) },
            ]}
          />
        </Card>

        <Card
          title="Mutasi Stok Barang Jadi"
          description="Net pergerakan inventaris (Barang Masuk - Barang Keluar)"
          right={
            <PeriodSelector value={stockPeriod} onChange={setStockPeriod} />
          }
        >
          <MonthlyBarChart
            months={stockAnalytics.keys.map((k) => formatPeriodLabel(k, stockPeriod))}
            label="Net Unit"
            data={stockAnalytics.stockNet.map((p) => p.value)}
          />
        </Card>
      </div>
    </div>
  )
}
