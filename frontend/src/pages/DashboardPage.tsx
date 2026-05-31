import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const cards = [
    { to: '/matchmaking', title: 'Find Match', body: 'Rejoindre la file 1v1 temps reel.' },
    { to: '/solo', title: 'Partie solo', body: 'Trouver un mot secret avec des scores semantiques.' },
    { to: '/leaderboard', title: 'Leaderboard', body: 'Suivre les scores et les victoires.' },
    { to: '/tournaments', title: 'Tournaments', body: 'Prepare bracket play.' },
  ];

  return (
    <section className="page-enter">
      <h1 className="text-3xl font-bold">Word Heist Arena</h1>
      <p className="mt-2 text-slate-600">Welcome, {user?.displayName ?? user?.username}.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map((card, index) => (
          <Link
            key={card.to}
            to={card.to}
            className="card-surface stagger-item p-5"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <h2 className="font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{card.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
