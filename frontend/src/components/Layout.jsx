import { Link, NavLink, useNavigate } from 'react-router-dom'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('fg_user') || 'null')

  function logout() {
    localStorage.removeItem('fg_token')
    localStorage.removeItem('fg_user')
    navigate('/login')
  }

  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">F</div>
            <span className="text-lg font-bold tracking-tight">FraudGuard</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkCls}>Dashboard</NavLink>
            <NavLink to="/transactions" className={linkCls}>Transactions</NavLink>
            <NavLink to="/alerts" className={linkCls}>Alerts</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-slate-600">
                {user.name} · <span className="text-xs uppercase">{user.role}</span>
              </span>
            )}
            <button onClick={logout} className="btn-ghost">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
