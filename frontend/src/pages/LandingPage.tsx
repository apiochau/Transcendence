import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <section className="mx-auto grid min-h-screen max-w-6xl content-center gap-8 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">Real-time 1v1 quiz battles</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">Transcendence Quiz</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            A clean foundation for matchmaking, live rooms, friend challenges, tournaments, stats, and ranked play.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800">Create account</Link>
            <Link to="/login" className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50">Sign in</Link>
          </div>
        </div>
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-panel p-5">
          {['JWT auth', 'Socket.IO rooms', 'Matchmaking queue', 'Tournament structure', 'Stats and leaderboard'].map((item) => (
            <div key={item} className="rounded-md bg-white px-4 py-3 text-sm font-medium shadow-sm">{item}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
