import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { GamesOverTimeChart } from '../components/analytics/GamesOverTimeChart';
import { SimilarityDonutChart } from '../components/analytics/SimilarityDonutChart';
import { CollectionRarityDonutChart } from '../components/analytics/CollectionRarityDonutChart';
import { AnalyticsOverviewCards } from '../components/analytics/AnalyticsOverviewCards';
import { useAnalyticsOverview } from '../components/analytics/useAnalyticsOverview';
import { WinSpeedBarChart } from '../components/analytics/WinSpeedBarChart';

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

interface CollectionRarityItem 
{
  rarity: string;
  count: number;
}

interface WinSpeedItem 
{
  label: string;
  count: number;
}

export function AnalyticsPage() 
{    
    //const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const { overview, lastUpdated } = useAnalyticsOverview(); // SMART POLLING OVERVIEW (handled by hook)
    const [overTime, setOverTime] = useState<OverTimeData | null>(null);
    const [days, setDays] = useState(7);
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [similarityDistribution, setSimilarityDistribution] = useState<SimilarityDistributionItem[]>([]);
    const [collectionRarity, setCollectionRarity] = useState<CollectionRarityItem[]>([]);
    const [winSpeedDistribution, setWinSpeedDistribution] = useState<WinSpeedItem[] | null>(null);

    //Load Overview
    // useEffect(() => 
    //   {
    //     apiClient.get<AnalyticsOverview>('/analytics/overview')
    //     .then((response) => setOverview(response.data));
    //   }, []);
    
    //Load Game over time(last 7 days)
    // useEffect(() => 
    //   {
    //     apiClient.get<OverTimeData>('/analytics/games-over-time', {
    //       params: {
    //         days: 7,},
    //     })
    //     .then((response) => setOverTime(response.data));
    //   }, []);
    useEffect(() => 
      {
        apiClient.get<OverTimeData>("/analytics/games-over-time", 
          { params: {startDate, endDate,},})
        .then((res) => setOverTime(res.data));
      }, [startDate, endDate]);
      

    //Load Similarity distribution
    useEffect(() => 
      {
        apiClient.get<SimilarityDistributionItem[]>("/analytics/similarity-distribution")
        .then((response) => setSimilarityDistribution(response.data));
      }, []);

    //Load Collection Rarity
    useEffect(() => 
      {
      apiClient
        .get<CollectionRarityItem[]>("/analytics/collection-rarity-distribution")
        .then((response) => setCollectionRarity(response.data));
      }, []);

    //Load Win Speed Distribution
    useEffect(() => {
        fetch('/api/analytics/win-speed-distribution')
          .then(res => res.json())
          .then(data => setWinSpeedDistribution(data))
          .catch(() => setWinSpeedDistribution([]));
      }, []);

    // if (!overview || !overTime || 
    //   similarityDistribution.length === 0|| collectionRarity.length === 0) {
    //   return <div>Loading...</div>;
    // 

    return (
      <section className="page-enter">
        <h1 className="text-3xl font-bold">
          Analytics Dashboard
        </h1>

        {/* Overview Section */}
        {overview ? (
          <AnalyticsOverviewCards
            overview={overview}
            lastUpdated={lastUpdated ?? undefined}
          />
        ) : (
          <div className="mt-4 text-gray-500">
            Loading overview...
          </div>
        )}

        {/* Analytics Charts Section */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-slate-600">
            Analytics Charts
          </h2>

        {/* Date Range Filters */}
        <div className="flex gap-3 items-end mt-4">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 text-white px-2 py-1 rounded"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 text-white px-2 py-1 rounded"
            />
          </div>
        </div>

        {/* Games Over Time */}
        <div className="mt-4">
          {overTime ? (
            <GamesOverTimeChart
              overTime={overTime}
              startDate={startDate}
              endDate={endDate}
            />
          ) : (
            <div className="card-surface h-[320px] flex items-center justify-center text-gray-500">
              Loading chart...
            </div>
          )}
        </div>

          {/* Donut Charts */}
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Similarity Distribution */}
            <div className="card-surface p-3">
              <h3 className="mb-4 text-lg font-semibold">
                Similarity Word Category Distribution
              </h3>

              <p className="mb-4 text-sm text-gray-500">
                Based on clicked suggestions by users
                (player behavior, not game generation)
              </p>

              {similarityDistribution.length > 0 ? (
                <SimilarityDonutChart
                  data={similarityDistribution}
                />
              ) : (
                <div className="h-[320px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>

            {/* Collection Rarity Distribution */}
            <div className="card-surface p-3">
              <h3 className="mb-4 text-lg font-semibold">
                Collection Rarity Distribution
              </h3>

              <p className="mb-4 text-sm text-gray-500">
                Distribution of collected words across all
                player inventories.
              </p>

              {collectionRarity.length > 0 ? (
                <CollectionRarityDonutChart
                  data={collectionRarity}
                />
              ) : (
                <div className="h-[320px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>

            {/* Win Speed Distribution */}
            <div className="mt-6 card-surface p-3">
              <h3 className="mb-4 text-lg font-semibold">
                Win Speed Distribution
              </h3>
              <p className="mb-4 text-sm text-gray-500">
                Time from first suggestion to game finished.
              </p>
              {winSpeedDistribution === null ? (
                <div className="h-[320px] flex items-center justify-center text-gray-500">
                  Loading...
                </div>
              ) : winSpeedDistribution.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              ) : (
                <WinSpeedBarChart data={winSpeedDistribution} />
              )}
            </div>

          </div>
        </div>
      </section>
    );
}


