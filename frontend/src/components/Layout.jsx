import { Link, NavLink, useNavigate } from 'react-router-dom'
import { IconShield, IconLogout } from './Icon'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('fg_user') || 'null')

  function logout() {
    localStorage.removeItem('fg_token')
    localStorage.removeItem('fg_user')
    navigate('/login')
  }

  const linkCls = ({ isActive }) => 'nav-link'
  const navProps = ({ isActive }) => isActive ? { 'aria-current': 'page' } : {}

  return (
    <div className="min-h-screen flex flex-col">
      <header className="top-strip sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-md bg-amber-500 text-slate-950 grid place-items-center
                            shadow-[0_8px_22px_-10px_rgba(245,158,11,0.7)]
                            group-hover:bg-amber-400 transition">
              <IconShield size={16} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-bold tracking-tight text-slate-100">FraudGuard</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mt-0.5">
                Risk console
              </span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            <NavLink to="/"        end className={linkCls} {...navProps}>Dashboard</NavLink>
            <NavLink to="/transactions" className={linkCls} {...navProps}>Transactions</NavLink>
            <NavLink to="/alerts"  className={linkCls} {...navProps}>Alerts</NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 uppercase tracking-[0.14em]">
              <span className="live-dot" aria-hidden="true" />
              <span>Live</span>
            </div>
            {user && (
              <div className="hidden sm:flex flex-col items-end leading-tight pr-3 border-r border-slate-800">
                <span className="text-sm text-slate-200 font-medium">{user.name}</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  {user.role}
                </span>
              </div>
            )}
            <button onClick={logout} className="btn-ghost" aria-label="Sign out">
              <IconLogout size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8">
        {children}
      </main>

      <footer className="border-t border-slate-800/80 mt-12">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>FraudGuard risk console</span>
          <span className="font-mono tracking-tight">v0.1.0 · local build</span>
        </div>
      </footer>
    </div>
  )
}
