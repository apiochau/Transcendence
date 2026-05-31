import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

interface LeaderboardRow {
  id: string;
  rating: number;
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
      <h1 className="text-3xl font-bold">Leaderboard</h1>
      <div className="card-surface mt-8 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Wins</th>
              <th className="px-4 py-3">Games</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="stagger-item border-t border-slate-100 transition hover:bg-slate-100" style={{ animationDelay: `${index * 55}ms` }}>
                <td className="px-4 py-3 font-medium">{row.user.displayName ?? row.user.username}</td>
                <td className="px-4 py-3">{row.rating}</td>
                <td className="px-4 py-3">{row.wins}</td>
                <td className="px-4 py-3">{row.gamesPlayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
