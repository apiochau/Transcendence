import { BookOpen, Swords, Trophy, User, Vault, WalletCards, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const cards = [
  { to: '/matchmaking', title: 'Trouver un match', body: 'Rejoindre la file 1v1 temps reel.', accent: 'text-accent', icon: Swords },
  { to: '/solo', title: 'Partie solo', body: 'S entrainer sur le mot secret sans pression.', accent: 'text-sky-300', icon: Zap },
  { to: '/collection', title: 'Collection', body: 'Voir les mots gagnes, leur rarete et ta valeur totale.', accent: 'text-amber-300', icon: WalletCards },
  { to: '/leaderboard', title: 'Classement', body: 'Comparer la valeur de collection des joueurs.', accent: 'text-emerald-300', icon: Trophy },
  { to: '/tournaments', title: 'Tournois', body: 'Preparer les parties en bracket.', accent: 'text-violet-300', icon: Vault },
  { to: '/rules', title: 'Regles du jeu', body: 'Comprendre les objectifs, les modes et les recompenses.', accent: 'text-cyan-300', icon: BookOpen },
  { to: '/profile', title: 'Profil', body: 'Gerer ton identite de joueur.', accent: 'text-slate-300', icon: User },
];

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="page-enter">
      <div className="panel-surface overflow-hidden p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Lexmon</p>
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
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className="interactive-card stagger-item rounded-md border border-slate-700 bg-slate-900 p-5"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <Icon className={`h-6 w-6 ${card.accent}`} aria-hidden="true" />
              <h2 className="mt-4 text-xl font-black">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{card.body}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
