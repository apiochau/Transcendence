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
    <section>
      <h1 className="text-3xl font-bold">Leaderboard</h1>
      <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
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
