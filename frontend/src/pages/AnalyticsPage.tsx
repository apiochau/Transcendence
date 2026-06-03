import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { GamesOverTimeChart } from '../components/analytics/GamesOverTimeChart';


interface AnalyticsOverview 
{
  totalUsers: number;
  totalGamesStarted: number;
  totalGamesEngaged: number;
  totalGamesCompleted: number;
  totalTournaments: number;
}

interface OverTimeData {
  engagedPerDay: { date: string; count: number }[];
  completedPerDay: { date: string; count: number }[];
}

export function AnalyticsPage() 
{    
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [overTime, setOverTime] = useState<OverTimeData | null>(null);

    //Load Overview
    useEffect(() => 
      {
        apiClient.get<AnalyticsOverview>('/analytics/overview')
        .then((response) => setOverview(response.data));
      }, []);
    
    //Load Game over time(last 7 days)
    useEffect(() => 
      {
        apiClient
        .get<OverTimeData>('/analytics/games-over-time', {
          params: {
            days: 7,},
        })
        .then((response) => setOverTime(response.data));
      }, []);

    if (!overview || !overTime) {
      return <div>Loading...</div>;
    }



        return (
          <section className="page-enter">
            <h1 className="text-3xl font-bold">
              Analytics Dashboard
            </h1>

            {/* Overview Section */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-slate-600">
                Total Overview
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="card-surface p-6">
                  <h3 className="text-sm text-slate-500">Users</h3>
                  <p className="mt-2 text-4xl font-bold">
                    {overview.totalUsers}
                  </p>
                </div>

                <div className="card-surface p-6">
                  <h3 className="text-sm text-slate-500">Started Sessions</h3>
                  <p className="mt-2 text-4xl font-bold">
                    {overview.totalGamesStarted}
                  </p>
                </div>

                <div className="card-surface p-6">
                  <h3 className="text-sm text-slate-500">Engaged Sessions</h3>
                  <p className="mt-2 text-4xl font-bold">
                    {overview.totalGamesEngaged}
                  </p>
                </div>

                <div className="card-surface p-6">
                  <h3 className="text-sm text-slate-500">Completed Sessions</h3>
                  <p className="mt-2 text-4xl font-bold">
                    {overview.totalGamesCompleted}
                  </p>
                </div>

                <div className="card-surface p-6">
                  <h3 className="text-sm text-slate-500">Tournaments</h3>
                  <p className="mt-2 text-4xl font-bold">
                    {overview.totalTournaments}
                  </p>
                </div>
              </div>
            </div>

            {/* Analytics Charts Section */}
            <div className="mt-10">
              <h2 className="text-lg font-semibold text-slate-600">
                Analytics Charts
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Games Over Time Chart */}
                <GamesOverTimeChart overTime={overTime} />
                {/* Future chart component */}
              </div>
            </div>
          </section>
        );
}