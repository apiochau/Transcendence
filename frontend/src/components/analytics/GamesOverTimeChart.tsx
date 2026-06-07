import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from 'recharts';


interface OverTimeData 
{
  engagedPerDay: { date: string; count: number }[];
  completedPerDay: { date: string; count: number }[];
}

interface GamesOverTimeChartProps {
  overTime: OverTimeData;
}

export function GamesOverTimeChart({ overTime }: GamesOverTimeChartProps) {
  const chartData = overTime.engagedPerDay.map((engaged) => ({
    date: engaged.date,
    engaged: engaged.count,
    completed: overTime.completedPerDay.find((c) => c.date === engaged.date)
      ?.count ?? 0,
  }));

  const exportCSV = () => {
    const header = ["Date", "Engaged Sessions", "Completed Sessions"];
    const rows = chartData.map((row) => [row.date, row.engaged, row.completed]);
    const csvContent = [header, ...rows].map((e) => e.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "games_over_time.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

return (
  <div className="card-surface p-6">
    <div className="mb-4 flex items-center justify-end">
      <button
        onClick={exportCSV}
        className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
      >
        Export CSV
      </button>
    </div>

    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend verticalAlign="top" height={36} />

        <Line type="monotone" dataKey="engaged" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);
}

