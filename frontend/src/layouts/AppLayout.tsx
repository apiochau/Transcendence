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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <NavLink to="/dashboard" className="text-lg font-semibold">Transcendence Quiz</NavLink>
          <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'text-accent' : 'text-slate-600 hover:text-ink'}>
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
          >
            {user?.username ?? 'Logout'}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
