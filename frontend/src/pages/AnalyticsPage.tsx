import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { GamesOverTimeChart } from '../components/analytics/GamesOverTimeChart';
import { SimilarityDonutChart } from '../components/analytics/SimilarityDonutChart';
import { AnalyticsOverviewCards } from '../components/analytics/AnalyticsOverviewCards';
import { useAnalyticsOverview } from '../components/analytics/useAnalyticsOverview';

interface OverTimeData 
{
  engagedPerDay: { date: string; count: number }[];
  completedPerDay: { date: string; count: number }[];
}

interface SimilarityDistributionItem 
{
  bucket: string;
  count: number;
}



export function AnalyticsPage() 
{    
    //const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const { overview, lastUpdated } = useAnalyticsOverview(); // SMART POLLING OVERVIEW (handled by hook)
    const [overTime, setOverTime] = useState<OverTimeData | null>(null);
    const [similarityDistribution, setSimilarityDistribution] = useState<SimilarityDistributionItem[]>([]);

    //Load Overview
    // useEffect(() => 
    //   {
    //     apiClient.get<AnalyticsOverview>('/analytics/overview')
    //     .then((response) => setOverview(response.data));
    //   }, []);
    
    //Load Game over time(last 7 days)
    useEffect(() => 
      {
        apiClient.get<OverTimeData>('/analytics/games-over-time', {
          params: {
            days: 7,},
        })
        .then((response) => setOverTime(response.data));
      }, []);

    //Load Similarity distribution
    useEffect(() => 
      {
        apiClient.get<SimilarityDistributionItem[]>("/analytics/similarity-distribution")
        .then((response) => setSimilarityDistribution(response.data));
      }, []);

    if (!overview || !overTime || similarityDistribution.length === 0) {
      return <div>Loading...</div>;
    }

    return (
      <section className="page-enter">
        <h1 className="text-3xl font-bold">
          Analytics Dashboard
        </h1>

        {/* Overview Section (LIVE via hook) */}
        <AnalyticsOverviewCards
          overview={overview}
          lastUpdated={lastUpdated?? undefined}
        />

        {/* Analytics Charts Section */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-slate-600">
            Analytics Charts
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Games Over Time */}
            <GamesOverTimeChart overTime={overTime} />

            {/* Similarity Distribution */}
            <div className="card-surface p-3">
              <h3 className="mb-4 text-lg font-semibold">
                Similarity Word Category Distribution
              </h3>
              <p className="mb-4 text-sm text-gray-500">
                Based on clicked suggestions by users (player behavior, not game generation)
              </p>

              <SimilarityDonutChart data={similarityDistribution}/>
            </div>
          </div>
        </div>
      </section>
    );
}
