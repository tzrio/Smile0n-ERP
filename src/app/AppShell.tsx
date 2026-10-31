/**
 * Professional App layout shell for Smile0n ERP:
 * - Clean sidebar with business division indicator & switcher
 * - Dark/light mode synchronization
 * - Modern typography and ergonomic contrast
 */
import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from './ThemeContext'
import { useDivision, type DivisionFilter } from './DivisionContext'

type IconName =
  | 'dashboard'
  | 'inventory'
  | 'production'
  | 'transactions'
  | 'finance'
  | 'meetings'
  | 'timeline'
  | 'employees'
  | 'profile'
  | 'logout'

function Icon({ name, className }: { name: IconName; className?: string }) {
  const common = className ?? 'h-4 w-4'

  if (name === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    )
  }

  if (name === 'inventory') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    )
  }

  if (name === 'production') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M17 18h1" />
        <path d="M12 18h1" />
        <path d="M7 18h1" />
      </svg>
    )
  }

  if (name === 'transactions') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    )
  }

  if (name === 'finance') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    )
  }

  if (name === 'meetings') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
      </svg>
    )
  }

  if (name === 'timeline') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h12" />
      </svg>
    )
  }

  if (name === 'employees') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }

  if (name === 'logout') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" x2="9" y1="12" y2="12" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  )
}

function LinkItem({
  to,
  label,
  icon,
  badge,
  collapsed,
}: {
  to: string
  label: string
  icon: IconName
  badge?: string
  collapsed: boolean
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors duration-150',
          collapsed ? 'justify-center px-2' : '',
          isActive
            ? 'bg-slate-800 text-slate-100 shadow-2xs dark:bg-slate-200 dark:text-slate-900'
            : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
        ].join(' ')
      }
      title={collapsed ? label : undefined}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <span className="flex min-w-0 flex-1 items-center justify-between">
          <span className="truncate">{label}</span>
          {badge && (
            <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium tracking-tight bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
              {badge}
            </span>
          )}
        </span>
      )}
    </NavLink>
  )
}

function initialsFromName(name: string) {
  const parts = name
    .split(' ')
    .map((p) => p.trim())
    .filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'S'
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { division, setDivision } = useDivision()
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const logoUrl = `${import.meta.env.BASE_URL}smileon_logo.jpg`
  const COLLAPSED_KEY = 'smileon.ui.sidebarCollapsed'

  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY)
      return raw === '1' || raw === 'true'
    } catch {
      return false
    }
  })

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = useMemo(
    () => [
      { to: '/app/dashboard', label: 'Dashboard', icon: 'dashboard' as const },
      { to: '/app/inventory', label: 'Stok & Produk', icon: 'inventory' as const },
      { to: '/app/production', label: 'Produksi (Wall Decor)', icon: 'production' as const, badge: 'Craft' },
      { to: '/app/transactions', label: 'Transaksi Kas', icon: 'transactions' as const },
      { to: '/app/finance', label: 'Laporan Keuangan', icon: 'finance' as const },
      { to: '/app/meetings', label: 'Rekap Rapat', icon: 'meetings' as const },
      { to: '/app/timeline-konten', label: 'Timeline Konten', icon: 'timeline' as const },
      { to: '/app/employees', label: 'Tim Smile0n', icon: 'employees' as const },
      { to: '/app/profile', label: 'Pengaturan Profil', icon: 'profile' as const },
    ],
    []
  )

  const primaryMobileItems = useMemo(() => {
    return menuItems.filter((m) =>
      ['/app/dashboard', '/app/inventory', '/app/transactions', '/app/finance'].includes(m.to)
    )
  }, [menuItems])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-[#090d16] dark:text-slate-200 antialiased flex flex-col md:flex-row transition-colors duration-150">
      {/* Desktop Sidebar */}
      <aside
        className={[
          'hidden md:flex md:flex-col md:h-screen md:sticky md:top-0 border-r border-slate-200/80 bg-white/70 backdrop-blur-xs dark:border-slate-800/80 dark:bg-[#0f172a]/70 transition-all duration-200 z-30',
          collapsed ? 'w-18' : 'w-64',
        ].join(' ')}
      >
        {/* Header Branding */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800/80">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={logoUrl}
                alt="Smile0n"
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
              <div className="min-w-0">
                <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                  Smile0n ERP
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">
                  Wall Decor & Food
                </div>
              </div>
            </div>
          ) : (
            <img
              src={logoUrl}
              alt="Smile0n"
              className="mx-auto h-7 w-7 rounded-md object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
          )}

          <button
            type="button"
            onClick={() =>
              setCollapsed((v) => {
                const next = !v
                try {
                  localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
                } catch {
                  // ignore
                }
                return next
              })
            }
            className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Division Switcher */}
        {!collapsed && (
          <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
              Divisi Usaha
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200/50 p-1 dark:bg-slate-800/50">
              {(
                [
                  { id: 'ALL', label: 'Semua' },
                  { id: 'WALL_DECOR', label: 'Decor' },
                  { id: 'FOOD', label: 'Roti' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDivision(tab.id as DivisionFilter)}
                  className={[
                    'rounded-md py-1 text-center text-[11px] font-medium transition-all',
                    division === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-slate-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {!collapsed && (
            <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              Menu Utama
            </div>
          )}
          {menuItems.map((it) => (
            <LinkItem
              key={it.to}
              to={it.to}
              label={it.label}
              icon={it.icon}
              badge={it.badge}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* User Card & Controls */}
        <div className="border-t border-slate-100 p-3 dark:border-slate-800/80">
          <div
            className={[
              'flex items-center gap-2.5 rounded-lg p-2 bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800',
              collapsed ? 'justify-center p-1.5' : '',
            ].join(' ')}
          >
            {user?.avatarDataUrl ? (
              <img
                src={user.avatarDataUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
                {initialsFromName(user?.name ?? '')}
              </div>
            )}

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {user?.name}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{user?.role}</span>
                  <span>•</span>
                  <span className={online ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}>
                    {online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              className={[
                'flex items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:bg-slate-800 transition-colors shadow-2xs',
                collapsed ? 'w-full' : 'flex-1 text-xs gap-1.5',
              ].join(' ')}
              title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
              {!collapsed && <span>{theme === 'dark' ? 'Terang' : 'Gelap'}</span>}
            </button>

            <button
              type="button"
              onClick={logout}
              className={[
                'flex items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 p-2 text-rose-600 hover:bg-rose-50 hover:border-rose-200 dark:border-slate-800 dark:bg-[#0f172a] dark:text-rose-400 dark:hover:bg-rose-950/20 transition-colors shadow-2xs',
                collapsed ? 'w-full' : 'flex-1 text-xs gap-1.5',
              ].join(' ')}
              title="Logout"
            >
              <Icon name="logout" className="h-4 w-4" />
              {!collapsed && <span>Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 dark:border-slate-800 dark:bg-[#0f172a] backdrop-blur-xs md:hidden">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="Smile0n" className="h-7 w-7 rounded-md object-cover" />
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Smile0n ERP
            </span>
            <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {division === 'ALL' ? 'Semua' : division === 'FOOD' ? 'Roti' : 'Decor'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 text-slate-600 dark:border-slate-800 dark:text-slate-300"
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 text-slate-600 dark:border-slate-800 dark:text-slate-300"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 p-4 pb-20 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200/80 bg-white/95 px-2 backdrop-blur-md dark:border-slate-800 dark:bg-[#0f172a]/95 md:hidden">
        {primaryMobileItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              [
                'flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-slate-900 font-semibold dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
              ].join(' ')
            }
          >
            <Icon name={it.icon} className="h-5 w-5" />
            <span className="truncate max-w-[64px]">{it.label.split(' ')[0]}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
          <span>Lainnya</span>
        </button>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative rounded-t-2xl border-t border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0f172a] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img src={logoUrl} alt="Smile0n" className="h-9 w-9 rounded-lg object-cover" />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Division Switcher */}
            <div className="py-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Pilih Divisi Usaha
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {(
                  [
                    { id: 'ALL', label: 'Semua' },
                    { id: 'WALL_DECOR', label: 'Wall Decor' },
                    { id: 'FOOD', label: 'Bakery / Roti' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDivision(tab.id as DivisionFilter)}
                    className={[
                      'rounded-md py-1.5 text-center text-xs font-medium',
                      division === tab.id
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold dark:bg-slate-900 dark:text-slate-100'
                        : 'text-slate-500 dark:text-slate-400',
                    ].join(' ')}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 py-2">
              {menuItems.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                    ].join(' ')
                  }
                >
                  <Icon name={it.icon} className="h-4 w-4" />
                  <span className="flex-1">{it.label}</span>
                  {it.badge && (
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {it.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  logout()
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
              >
                <Icon name="logout" className="h-4 w-4" />
                <span>Logout dari Smile0n</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
