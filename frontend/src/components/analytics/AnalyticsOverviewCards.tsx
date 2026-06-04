interface AnalyticsOverview {
  totalUsers: number;
  totalGamesStarted: number;
  totalGamesEngaged: number;
  totalGamesCompleted: number;
  totalTournaments: number;
}

interface Props {
  overview: AnalyticsOverview;
  lastUpdated?: Date;
}

export function AnalyticsOverviewCards({
  overview,
  lastUpdated,
}: Props) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-600">
          Total Overview
        </h2>

        {lastUpdated && (
          <span className="text-xs text-slate-500">
            Last updated:{" "}
            {lastUpdated.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
      </div>

        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Live updates every 10s
          </div>
        )}

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card-surface p-6">
          <h3 className="text-sm text-slate-500">Users</h3>
          <p className="mt-2 text-4xl font-bold">
            {overview.totalUsers}
          </p>
        </div>

        <div className="card-surface p-6">
          <h3 className="text-sm text-slate-500">
            Started Sessions
          </h3>
          <p className="mt-2 text-4xl font-bold">
            {overview.totalGamesStarted}
          </p>
        </div>

        <div className="card-surface p-6">
          <h3 className="text-sm text-slate-500">
            Engaged Sessions
          </h3>
          <p className="mt-2 text-4xl font-bold">
            {overview.totalGamesEngaged}
          </p>
        </div>

        <div className="card-surface p-6">
          <h3 className="text-sm text-slate-500">
            Completed Sessions
          </h3>
          <p className="mt-2 text-4xl font-bold">
            {overview.totalGamesCompleted}
          </p>
        </div>

        <div className="card-surface p-6">
          <h3 className="text-sm text-slate-500">
            Tournaments
          </h3>
          <p className="mt-2 text-4xl font-bold">
            {overview.totalTournaments}
          </p>
        </div>
      </div>
    </div>
  );
}