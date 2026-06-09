import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from 'recharts';


interface OverTimeData 
{
  engagedPerDay: { date: string; count: number }[];
  engagedCompletedPerDay: { date: string; count: number }[];
}

interface GamesOverTimeChartProps {
  overTime: OverTimeData;
}

// export function GamesOverTimeChart({ overTime }: GamesOverTimeChartProps) {
//   const chartData = overTime.engagedPerDay.map((engaged) => ({
//     date: engaged.date,
//     engaged: engaged.count,
//     completed: overTime.completedPerDay.find((c) => c.date === engaged.date)
//       ?.count ?? 0,
//   }));

//   const exportCSV = () => {
//     const header = ["Date", "Engaged Sessions", "Completed Sessions"];
//     const rows = chartData.map((row) => [row.date, row.engaged, row.completed]);
//     const csvContent = [header, ...rows].map((e) => e.join(",")).join("\n");

//     const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);

//     const link = document.createElement("a");
//     link.href = url;
//     link.setAttribute("download", "games_over_time.csv");
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
//   };

// return (
//   <div className="card-surface p-6">
//     <div className="mb-4 flex items-center justify-end">
//       <button
//         onClick={exportCSV}
//         className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
//       >
//         Export CSV
//       </button>
//     </div>

//     <ResponsiveContainer width="100%" height={300}>
//       <LineChart data={chartData}>
//         <CartesianGrid strokeDasharray="3 3" />
//         <XAxis dataKey="date" />
//         <YAxis allowDecimals={false} />
//         <Tooltip />
//         <Legend verticalAlign="top" height={36} />

//         <Line type="monotone" dataKey="Engaged Not Completed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
//         <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
//       </LineChart>
//     </ResponsiveContainer>
//   </div>
// );
// }

export function GamesOverTimeChart({ overTime }: GamesOverTimeChartProps) {
  const chartData = overTime.engagedPerDay.map((engaged) => {
    const engagedCompleted =
      overTime.engagedCompletedPerDay.find(
        (c) => c.date === engaged.date
      )?.count ?? 0;

    const abandoned = engaged.count - engagedCompleted;

    return {
      date: engaged.date,
      engaged: engaged.count,
      engagedCompleted,
      abandoned: abandoned < 0 ? 0 : abandoned,
    };
  });

  const exportCSV = () => {
    const header = [
      "Date",
      "Engaged Sessions",
      "Engaged Completed Sessions",
      "Engaged Drop-off Sessions",
    ];

    const rows = chartData.map((row) => [
      row.date,
      row.engaged,
      row.engagedCompleted,
      row.abandoned,
    ]);

    const csvContent = [header, ...rows].map((e) => e.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

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

          {/* engaged */}
          <Line
            type="monotone"
            dataKey="engaged"
            name="Engaged Sessions"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
          />

          {/* engaged + completed */}
          <Line
            type="monotone"
            dataKey="engagedCompleted"
            name="Engaged Completed"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
          />

          {/* Engaged Drop-off */}
          <Line
            type="monotone"
            dataKey="abandoned"
            name="Engaged Drop-off"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {/* chart explanation (UI-level annotation) */}
      <div className="mb-4 text-sm text-gray-500 space-y-1 text-right">

        <div className="h-2" />

        <div>
          <span className="font-medium">Engaged Sessions:</span>{" "}
          interacted with at least one suggestion
        </div>

        <div>
          <span className="font-medium">Engaged Completed:</span>{" "}
          finished game (win or give up)
        </div>

        <div>
          <span className="font-medium">Engaged Drop-off:</span>{" "}
          started interacting but did not finish
        </div>

      </div>
    </div>
  );
}