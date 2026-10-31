import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { getFirebaseAuth, getFirestoreDb } from '../firebase/firebase'
import { isoNow } from '../utils/date'
import { useTheme } from '../app/ThemeContext'
import { LogoLoading } from '../components/LogoLoading'

export function SignupPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const logoUrl = `${import.meta.env.BASE_URL}smileon_logo.jpg`

  const isFirebaseMode = useMemo(() => {
    const raw = ((import.meta as any).env?.VITE_DATA_SOURCE as string | undefined) ?? 'local'
    return raw === 'firebase'
  }, [])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isFirebaseMode) {
      navigate('/login', { replace: true })
    }
  }, [isFirebaseMode, navigate])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const nextName = name.trim()
      const nextEmail = email.trim().toLowerCase()

      if (!nextName) throw new Error('Nama wajib diisi')
      if (!nextEmail || !nextEmail.includes('@')) throw new Error('Email tidak valid')
      if (!password || password.length < 6) throw new Error('Password minimal 6 karakter')

      const auth = getFirebaseAuth()
      const cred = await createUserWithEmailAndPassword(auth, nextEmail, password)
      await updateProfile(cred.user, { displayName: nextName })

      const db = getFirestoreDb()
      const ref = doc(db, 'users', cred.user.uid)
      const now = isoNow()
      const existing = await getDoc(ref)

      if (!existing.exists()) {
        await setDoc(
          ref,
          {
            email: nextEmail,
            name: nextName,
            role: 'PENDING',
            position: '',
            avatarDataUrl: '',
            createdAt: now,
            updatedAt: now,
          },
          { merge: true }
        )
      } else {
        await updateDoc(ref, {
          name: nextName,
          updatedAt: now,
        } as any)
      }

      await signOut(auth)
      navigate('/login', {
        replace: true,
        state: { reason: 'Akun berhasil dibuat. Tunggu CEO mengaktifkan role kamu.' },
      })
    } catch (err: any) {
      const code = String(err?.code ?? '')
      if (code === 'auth/email-already-in-use') {
        setError('Email sudah terdaftar')
      } else {
        setError(err instanceof Error ? err.message : 'Gagal daftar')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isFirebaseMode) return null

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-200 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-150">
      <LogoLoading open={loading} label="Membuat akun…" />

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
            alt="Smile0n"
            className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200/80 dark:ring-slate-700 shadow-2xs"
          />
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          Pendaftaran Anggota Tim
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Akun baru akan berstatus PENDING hingga disetujui oleh CEO
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xs dark:border-slate-800/80 dark:bg-[#0f172a]/70 dark:shadow-none">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Nama Lengkap
              </label>
              <div className="mt-1.5">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Email
              </label>
              <div className="mt-1.5">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@smileon.id"
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
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Membuat Akun...' : 'Daftarkan Akun'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 underline"
              onClick={() => navigate('/login')}
            >
              Sudah punya akun? Masuk di sini
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
