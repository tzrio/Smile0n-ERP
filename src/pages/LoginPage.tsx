import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../app/ThemeContext'
import { LogoLoading } from '../components/LogoLoading'

export function LoginPage() {
  const { login, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string; reason?: string } }
  const logoUrl = `${import.meta.env.BASE_URL}smileon_logo.jpg`

  const isFirebaseMode = useMemo(() => {
    const raw = ((import.meta as any).env?.VITE_DATA_SOURCE as string | undefined) ?? 'local'
    return raw === 'firebase'
  }, [])

  const redirectTo = useMemo(() => {
    return location.state?.from ?? '/app/dashboard'
  }, [location.state])

  const reason = location.state?.reason

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/app/dashboard', { replace: true })
    }
  }, [user, navigate])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ email, password })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-200 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-150">
      <LogoLoading open={loading} label="Memverifikasi kredensial..." />

      {/* Floating Theme Toggle in Login */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:bg-slate-800 transition-colors shadow-2xs"
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
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src={logoUrl}
            alt="Smile0n ERP"
            className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200/80 dark:ring-slate-700 shadow-2xs"
          />
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          Smile0n ERP System
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Internal Management: Wall Decor Craft & Bakery Reseller
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xs dark:border-slate-800/80 dark:bg-[#0f172a]/70 dark:shadow-none">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Email Akun
              </label>
              <div className="mt-1.5">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ceo@walldecor.local"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1.5">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                {error}
              </div>
            )}

            {reason && !error && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                {reason}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Memverifikasi...' : 'Masuk ke Portal'}
            </Button>
          </form>

          {!isFirebaseMode && (
            <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Akun Anggota (Demo Mode):
              </div>
              <div className="mt-2 space-y-1 font-mono text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Rakha (CEO):</span>
                  <span>ceo@walldecor.local / admin123</span>
                </div>
                <div className="flex justify-between">
                  <span>Roihan (CTO):</span>
                  <span>cto@walldecor.local / admin123</span>
                </div>
                <div className="flex justify-between">
                  <span>Bagus (CMO):</span>
                  <span>cmo@walldecor.local / admin123</span>
                </div>
              </div>
            </div>
          )}

          {isFirebaseMode && (
            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 underline"
                onClick={() => navigate('/signup')}
              >
                Daftar akun tim baru
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
