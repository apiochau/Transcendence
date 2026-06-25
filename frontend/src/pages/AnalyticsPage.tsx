import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { GamesOverTimeChart } from '../components/analytics/GamesOverTimeChart';
import { SimilarityDonutChart } from '../components/analytics/SimilarityDonutChart';
import { CollectionRarityDonutChart } from '../components/analytics/CollectionRarityDonutChart';
import { AnalyticsOverviewCards } from '../components/analytics/AnalyticsOverviewCards';
import { useAnalyticsOverview } from '../components/analytics/useAnalyticsOverview';
import { WinSpeedBarChart } from '../components/analytics/WinSpeedBarChart';
import { SentimentDonutChart } from '../components/analytics/SentimentDonutChart';

interface OverTimeData 
{
  engagedPerDay: { date: string; count: number }[];
  engagedCompletedPerDay: { date: string; count: number }[];
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

interface SentimentItem 
{
  sentiment: string;
  count: number;
}

export function AnalyticsPage() 
{    
    //const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const { overview, lastUpdated } = useAnalyticsOverview(); // SMART POLLING OVERVIEW (handled by hook)
    const [overTime, setOverTime] = useState<OverTimeData | null>(null);
    const [similarityDistribution, setSimilarityDistribution] = useState<SimilarityDistributionItem[]>([]);
    const [collectionRarity, setCollectionRarity] = useState<CollectionRarityItem[]>([]);
    const [winSpeedDistribution, setWinSpeedDistribution] = useState<WinSpeedItem[] | null>(null);
    const [sentimentDistribution, setSentimentDistribution] = useState<SentimentItem[]>([]);
    
    const today = new Date();
    const defaultEndDate = today.toISOString().slice(0, 10);
    const defaultStartDate = new Date(
      today.getTime() - 6 * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 10);
    const [startDate, setStartDate] = useState<string>(defaultStartDate);
    const [endDate, setEndDate] = useState<string>(defaultEndDate);
    
    //Load Game over time(last 7 days)
    {/* fetch API */}
    useEffect(() => {
      if (!startDate || !endDate) return;

      apiClient
        .get<OverTimeData>("/analytics/games-over-time", {
          params: { startDate, endDate },
        })
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

    //Load Sentiment Distribution
    useEffect(() => {
      apiClient
        .get<SentimentItem[]>("/analytics/sentiment")
        .then((response) => setSentimentDistribution(response.data))
        .catch(() => setSentimentDistribution([]));
    }, []); 

    // if (!overview || !overTime || 
    //   similarityDistribution.length === 0|| collectionRarity.length === 0) {
    //   return <div>Loading...</div>;
    // 

    return (
      <section className="page-enter">
        <h1 className="text-3xl font-bold">
          Analytics Dashboard of Partie solo
        </h1>

        {/* Overview Section */}
        {overview ? (
          <AnalyticsOverviewCards
            overview={overview}
            lastUpdated={lastUpdated ?? undefined}
          />
        ) : (
          <div className="mt-4 text-gray-400">
            Loading overview...
          </div>
        )}

        {/* Analytics Charts Section */}
        <div className="mt-10">
        <h2 className="mb-6 text-lg font-semibold text-slate-600">
          Analytics Charts
        </h2>

      {/* Games Over Time Chart */}
      <div className="card-surface p-4">

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Engaged Games Played Over Time
        </h3>

        <div className="flex gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 text-white px-2 py-1 rounded"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-400">
              End Date
            </label>
    <input
      type="date"
      value={endDate}
      min={startDate}
      max={defaultEndDate}
      onChange={(e) => setEndDate(e.target.value)}
      className="bg-slate-800 text-white px-2 py-1 rounded"
    />
          </div>

          <button
            className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-500"
            onClick={() => {
              const today = new Date();
              const last7 = new Date();
              last7.setDate(today.getDate() - 6);

              setStartDate(last7.toISOString().slice(0, 10));
              setEndDate(today.toISOString().slice(0, 10));
            }}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      {overTime ? (
        <GamesOverTimeChart overTime={overTime} />
      ) : (
        <div className="h-[320px] flex items-center justify-center text-gray-500">
          Loading chart...
        </div>
      )}
    </div>

         {/* Donut Charts */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 items-stretch">

          {/* Similarity Distribution */}
          <div className="card-surface p-3 h-full flex flex-col">
            <h3 className="mb-4 text-lg font-semibold">
              Similarity Word Category Distribution
            </h3>

            <p className="mb-4 text-sm text-gray-400">
              Based on clicked suggestions by users
              (player behavior, not game generation)
            </p>

            <div className="flex-1">
              {similarityDistribution.length > 0 ? (
                <SimilarityDonutChart data={similarityDistribution} />
              ) : (
                <div className="h-[320px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Collection Rarity Distribution */}
          <div className="card-surface p-3 h-full flex flex-col">
            <h3 className="mb-4 text-lg font-semibold">
              Collection Rarity Distribution
            </h3>

            <p className="mb-4 text-sm text-gray-400">
              Distribution of collected words across all player inventories.
            </p>

            <div className="flex-1">
              {collectionRarity.length > 0 ? (
                <CollectionRarityDonutChart data={collectionRarity} />
              ) : (
                <div className="h-[320px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Session Duration Distribution */}
          <div className="card-surface p-3 h-full flex flex-col">
              <h3 className="mb-4 text-lg font-semibold">
                Session Duration Distribution
              </h3>
              <p className="mb-4 text-sm text-gray-400">
                Time from first suggestion click to session completion or abandon click.
              </p>
              <div className="h-10" />
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

          {/* Feedback Sentiment Distribution */}
          <div className="card-surface p-3 h-full flex flex-col">
            <h3 className="mb-4 text-lg font-semibold">
              Feedback Distribution
            </h3>

            <p className="mb-4 text-sm text-gray-400">
              Distribution of user feedback sentiment generated
              from post-game comments.
            </p>

            <div className="flex-1">
              {sentimentDistribution.length > 0 ? (
                <SentimentDonutChart data={sentimentDistribution} />
              ) : (
                <div className="h-[320px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>



          </div>
        </div>
      </section>
    );
}


