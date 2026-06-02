import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';


interface AnalyticsOverview {
  totalUsers: number;
  totalGames: number;
  totalTournaments: number;
}

export function AnalyticsPage() 
{    
    const [overview, setOverview] =
        useState<AnalyticsOverview | null>(null); //| null:因為第一次載入時還沒有AnalyticsOverview資料

    useEffect(() => 
      {
        apiClient.get<AnalyticsOverview>('/analytics/overview')
        .then((response) => setOverview(response.data));
      }, []);

      if (!overview) {
      return <div>Loading...</div>;
      }

  return (
  <section className="page-enter">
    <h1 className="text-3xl font-bold">
      Analytics Dashboard
    </h1>

    {overview && (
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">

        <div className="card-surface p-6">
          <h2 className="text-sm text-slate-500">
            Total Users
          </h2>
          <p className="mt-2 text-4xl font-bold">
            {overview.totalUsers}
          </p>
        </div>

        <div className="card-surface p-6">
          <h2 className="text-sm text-slate-500">
            Total Games
          </h2>
          <p className="mt-2 text-4xl font-bold">
            {overview.totalGames}
          </p>
        </div>

        <div className="card-surface p-6">
          <h2 className="text-sm text-slate-500">
            Total Tournaments
          </h2>
          <p className="mt-2 text-4xl font-bold">
            {overview.totalTournaments}
          </p>
        </div>

      </div>
    )}
  </section>
);
}