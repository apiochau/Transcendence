import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

interface Tournament {
  id: string;
  name: string;
  status: string;
}

export function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    apiClient.get<Tournament[]>('/tournaments').then((response) => setTournaments(response.data));
  }, []);

  return (
    <section>
      <h1 className="text-3xl font-bold">Tournaments</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {tournaments.map((tournament) => (
          <article key={tournament.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">{tournament.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{tournament.status}</p>
          </article>
        ))}
        {tournaments.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm text-slate-600">No tournaments yet.</div>
        )}
      </div>
    </section>
  );
}
