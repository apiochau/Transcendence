import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <section className="mx-auto grid min-h-screen max-w-6xl content-center gap-8 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="page-enter">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">Jeu de proximite semantique</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">Lexmon</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Trouve le mot secret avec des indices de proximite semantique, puis affronte d'autres joueurs en duel temps reel.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="motion-button rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800">Creer un compte</Link>
            <Link to="/login" className="motion-button ghost-button rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold">Se connecter</Link>
          </div>
        </div>
        <div className="card-surface grid gap-3 p-5">
          {['Mode solo Cémantix-like', 'Scores de proximite', 'Historique des essais', 'Rooms Socket.IO pretes', 'Matchmaking 1v1'].map((item, index) => (
            <div key={item} className="stagger-item rounded-md bg-white px-4 py-3 text-sm font-medium shadow-sm" style={{ animationDelay: `${index * 80}ms` }}>{item}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
