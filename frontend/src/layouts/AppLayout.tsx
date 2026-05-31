import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/matchmaking', label: 'Matchmaking' },
  { to: '/solo', label: 'Partie solo' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/profile', label: 'Profile' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-panel text-ink">
      <header className="sticky top-0 z-20 border-b border-slate-700 bg-slate-950/95 text-ink shadow-[0_10px_30px_rgb(0_0_0_/_0.28)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <NavLink to="/dashboard" className="text-lg font-semibold transition hover:text-accent">Word Heist Arena</NavLink>
          <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-2 py-1 transition hover:-translate-y-0.5 hover:text-ink ${
                    isActive ? 'bg-slate-100 text-accent shadow-sm' : 'text-slate-600'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="motion-button ghost-button rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
          >
            {user?.username ?? 'Logout'}
          </button>
        </div>
      </header>
      <main className="page-enter mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
