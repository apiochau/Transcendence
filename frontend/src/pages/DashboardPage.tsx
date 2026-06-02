import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const cards = [
  { to: '/matchmaking', title: 'Find Match', body: 'Rejoindre la file 1v1 temps reel.', accent: 'text-accent' },
  { to: '/solo', title: 'Partie solo', body: 'S entrainer sur le mot secret sans pression.', accent: 'text-sky-300' },
  { to: '/collection', title: 'Collection', body: 'Voir les mots gagnes, leur rarete et ta valeur totale.', accent: 'text-amber-300' },
  { to: '/leaderboard', title: 'Leaderboard', body: 'Comparer la valeur de collection des joueurs.', accent: 'text-emerald-300' },
  { to: '/tournaments', title: 'Tournaments', body: 'Prepare bracket play.', accent: 'text-violet-300' },
  { to: '/profile', title: 'Profile', body: 'Gerer ton identite de joueur.', accent: 'text-slate-300' },
];

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="page-enter">
      <div className="panel-surface overflow-hidden p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Word Heist Arena</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black">Bienvenue, {user?.displayName ?? user?.username}</h1>
        <p className="mt-3 max-w-2xl text-slate-500">
          Lance un duel, gagne le mot secret, puis fais monter la valeur de ta collection.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/matchmaking"
            className="motion-button rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-teal-700"
          >
            Trouver un match
          </Link>
          <Link
            to="/collection"
            className="motion-button ghost-button rounded-md border border-amber-400/60 px-5 py-3 font-semibold text-amber-100"
          >
            Ouvrir la collection
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <Link
            key={card.to}
            to={card.to}
            className="interactive-card stagger-item rounded-md border border-slate-700 bg-slate-900 p-5"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <p className={`text-sm font-semibold uppercase tracking-[0.16em] ${card.accent}`}>Menu</p>
            <h2 className="mt-3 text-xl font-black">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{card.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
