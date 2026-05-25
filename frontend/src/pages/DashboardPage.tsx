import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-slate-600">Welcome, {user?.displayName ?? user?.username}.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link to="/matchmaking" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-accent">
          <h2 className="font-semibold">Find Match</h2>
          <p className="mt-2 text-sm text-slate-600">Join the real-time queue.</p>
        </Link>
        <Link to="/leaderboard" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-accent">
          <h2 className="font-semibold">Leaderboard</h2>
          <p className="mt-2 text-sm text-slate-600">Track ranking and wins.</p>
        </Link>
        <Link to="/tournaments" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-accent">
          <h2 className="font-semibold">Tournaments</h2>
          <p className="mt-2 text-sm text-slate-600">Prepare bracket play.</p>
        </Link>
      </div>
    </section>
  );
}
