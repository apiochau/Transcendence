import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

export interface AnalyticsOverview {
  totalUsers: number;
  totalGamesStarted: number;
  totalGamesEngaged: number;
  totalGamesCompleted: number;
  totalTournaments: number;
}

export function useAnalyticsOverview() {
  const [overview, setOverview] =
    useState<AnalyticsOverview | null>(null);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const fetchOverview = async () => {
    try {
      const res =
        await apiClient.get<AnalyticsOverview>(
          '/analytics/overview'
        );

      setOverview(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOverview();

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchOverview();
      }
    }, 10000); // 10s smart polling

    return () => clearInterval(interval);
  }, []);

  return {
    overview,
    lastUpdated,
  };
}