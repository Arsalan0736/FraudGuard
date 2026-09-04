import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { IconShield, IconLock, IconSparkle } from '../components/Icon'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('fg_token', data.token)
      localStorage.setItem('fg_user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.error || 'login failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_minmax(420px,480px)]">
      {/* Left: brand panel (hidden on mobile) */}
      <aside className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden
                        bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950
                        border-r border-slate-800">
        <div className="absolute inset-0 pointer-events-none opacity-30"
             style={{
               background:
                 'radial-gradient(circle at 25% 15%, rgba(245,158,11,0.20) 0%, transparent 45%),' +
                 'radial-gradient(circle at 80% 80%, rgba(244,63,94,0.18) 0%, transparent 45%)',
             }} />
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-amber-500 text-slate-950 grid place-items-center">
            <IconShield size={18} />
          </div>
          <div>
            <div className="font-bold tracking-tight">FraudGuard</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Risk console
            </div>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-slate-100">
            Catch fraud before<br />
            <span className="text-amber-400">it catches your users.</span>
          </h1>
          <p className="mt-4 text-slate-400 text-base max-w-md leading-relaxed">
            Rule-based scoring, ML risk modeling, and LLM-generated explanations,
            all in one analyst console.
          </p>

          <div className="mt-8 flex items-center gap-2 text-xs text-slate-500 uppercase tracking-[0.14em]">
            <IconSparkle size={14} />
            <span>Seed users ship with password123</span>
          </div>
        </div>

        <div className="relative text-[11px] text-slate-500 font-mono tracking-tight">
          v0.1.0 · local build
        </div>
      </aside>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-slate-950">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm surface p-8 space-y-5"
        >
          <div className="flex items-center gap-2 lg:hidden mb-2">
            <div className="w-8 h-8 rounded-md bg-amber-500 text-slate-950 grid place-items-center">
              <IconShield size={16} />
            </div>
            <span className="font-bold tracking-tight">FraudGuard</span>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-100">Sign in</h2>
            <p className="text-sm text-slate-400 mt-1">Use your analyst credentials.</p>
          </div>

          {error && (
            <div role="alert"
                 className="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="email" required
                   value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" autoComplete="current-password" required
                   value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
              <IconLock size={11} />
              <span>Try user1@fraudguard.dev / password123</span>
            </p>
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in' : 'Sign in'}
          </button>

          <p className="text-sm text-slate-400 text-center">
            No account?{' '}
            <Link to="/register" className="text-amber-400 hover:text-amber-300">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
