import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from 'recharts';

interface OverTimeData 
{
  engagedPerDay: { date: string; count: number }[];
  completedPerDay: { date: string; count: number }[];
}

interface GamesOverTimeChartProps 
{
  overTime: OverTimeData;
}

export function GamesOverTimeChart({overTime,}: GamesOverTimeChartProps) 
{
    const chartData = overTime.engagedPerDay.map((engaged) => (
    {
        date: engaged.date,
        engaged: engaged.count,
        completed:
        overTime.completedPerDay.find(
            (completed) => completed.date === engaged.date,
        )?.count ?? 0,
    }));

    return (
        <div className="card-surface p-6">
        <h3 className="mb-4 text-lg font-semibold">
            Games Played Over Last 7 Days
        </h3>

        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Line
                type="monotone"
                dataKey="engaged"
                stroke="#3b82f6" // blue
                strokeWidth={2}
                dot={{ r: 4 }}
            />
            <Line
                type="monotone"
                dataKey="completed"
                stroke="#10b981" // green
                strokeWidth={2}
                dot={{ r: 4 }}
            />
            </LineChart>
        </ResponsiveContainer>
        </div>
        );
}