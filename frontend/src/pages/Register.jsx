import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { IconShield } from '../components/Icon'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('analyst')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const { data } = await api.post('/auth/register', { name, email, password, role })
      localStorage.setItem('fg_token', data.token)
      localStorage.setItem('fg_user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.error || 'registration failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-slate-950">
      <form onSubmit={onSubmit} className="w-full max-w-sm surface p-8 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-md bg-amber-500 text-slate-950 grid place-items-center">
            <IconShield size={16} />
          </div>
          <div>
            <div className="font-bold tracking-tight">FraudGuard</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">New account</div>
          </div>
        </div>
        <h1 className="text-xl font-semibold text-slate-100">Create an account</h1>

        {error && (
          <div role="alert"
               className="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" required minLength={6}
                 value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="role">Role</label>
          <select id="role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="analyst">analyst</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating' : 'Create account'}
        </button>

        <p className="text-sm text-slate-400 text-center">
          Already registered?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
