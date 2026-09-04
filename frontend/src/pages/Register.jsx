import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

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
    <div className="min-h-screen grid place-items-center bg-slate-100">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-4">
        <h1 className="text-lg font-semibold">Create an account</h1>
        {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</div>}
        <div>
          <label className="label">Name</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="analyst">analyst</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="text-sm text-slate-600 text-center">
          Already registered? <Link to="/login" className="text-brand-700 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
