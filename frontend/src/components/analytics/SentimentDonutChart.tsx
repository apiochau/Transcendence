import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from "recharts";

type SentimentItem = 
{
  sentiment: string | null;
  count: number;
};

type Props = 
{
  data: SentimentItem[];
};

const SENTIMENT_LABELS: Record<string, string> = 
{
  POSITIVE: "Positive",
  NEUTRAL: "Neutral",
  NEGATIVE: "Negative",
};

const COLORS: Record<string, string> = 
{
  POSITIVE: "#22c55e",
  NEUTRAL: "#94a3b8",
  NEGATIVE: "#ef4444",
};

export function SentimentDonutChart({ data }: Props) 
{
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.count, 0),
    [data]
  );

  return (
    <div className="w-full">
      <div className="relative w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="sentiment"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              activeIndex={activeIndex ?? undefined}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              activeShape={(props: any) => (
                <Sector
                  {...props}
                  outerRadius={props.outerRadius + 10}
                />
              )}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`${entry.sentiment}-${index}`}
                  fill={COLORS[entry.sentiment ?? ""] ?? "#94a3b8"}
                />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                borderRadius: "10px",
                border: "none",
                boxShadow: "0 4px 15px rgba(0,0,0,0.12)",
              }}
              formatter={(value: number, _, props) => {
                const percent = ((value / total) * 100).toFixed(1);

                return [
                  `${value} feedbacks (${percent}%)`,
                  SENTIMENT_LABELS[
                    props.payload.sentiment
                  ] ?? props.payload.sentiment,
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">
            {total}
          </span>
          <span className="text-xs text-gray-300">
            Total feedbacks
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 space-y-0.5 text-[14px] text-gray-300 leading-tight">
        <div>🟢 Positive: users enjoyed the experience</div>
        <div>⚪ Neutral: unclear or no strong opinion</div>
        <div>🔴 Negative: users reported dissatisfaction</div>
      </div>
     </div>
  );
}