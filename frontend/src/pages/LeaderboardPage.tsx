import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

interface LeaderboardRow {
  id: string;
  collectionValue: number;
  wins: number;
  gamesPlayed: number;
  user: {
    username: string;
    displayName: string | null;
  };
}

export function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    apiClient.get<LeaderboardRow[]>('/stats/leaderboard').then((response) => setRows(response.data));
  }, []);

  return (
    <section className="page-enter">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Classement</p>
      <h1 className="mt-2 text-3xl font-bold">Leaderboard collection</h1>
      <p className="mt-2 text-sm text-slate-500">Les joueurs sont classes par valeur totale de mots collectes.</p>
      <div className="card-surface mt-8 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Valeur collection</th>
              <th className="px-4 py-3">Wins</th>
              <th className="px-4 py-3">Games</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="stagger-item border-t border-slate-100 transition hover:bg-slate-100" style={{ animationDelay: `${index * 55}ms` }}>
                <td className="px-4 py-3 font-black text-accent">{index + 1}</td>
                <td className="px-4 py-3 font-medium">{row.user.displayName ?? row.user.username}</td>
                <td className="px-4 py-3 font-black">{row.collectionValue}</td>
                <td className="px-4 py-3">{row.wins}</td>
                <td className="px-4 py-3">{row.gamesPlayed}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>Aucune collection pour le moment.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
