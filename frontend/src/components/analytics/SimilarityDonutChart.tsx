import { useMemo, useState } from "react";
import {PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector,
} from "recharts";

type DistributionItem = 
{
  bucket: string;
  count: number;
};

type Props = 
{
  data: DistributionItem[];
};


// 對應英文 label
const BUCKET_LABELS: Record<string, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  frozen: "Frozen",
};

// 對應顏色
const COLORS: Record<string, string> = {
  hot: "#ef4444",      // red
  warm: "#f59e0b",     // orange
  cold: "#3b82f6",     // blue
  frozen: "#94a3b8",   // gray
};

export function SimilarityDonutChart({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // 計算總數
  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.count, 0),
    [data]
  );

  // hover 時高亮
  const activeItem = activeIndex !== null ? data[activeIndex] : null;

    return (
    <div className="w-full">
        {/* Chart container */}
        <div className="relative w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
            <Pie
                data={data}
                dataKey="count"
                nameKey="bucket"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
                activeIndex={activeIndex ?? undefined}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                activeShape={(props: any) => (
                <Sector {...props} outerRadius={props.outerRadius + 10} />
                )}
            >
                {data.map((entry) => (
                <Cell
                    key={entry.bucket}
                    fill={COLORS[entry.bucket] ?? "#94a3b8"}
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
                    `${value} guesses (${percent}%)`,
                    BUCKET_LABELS[props.payload.bucket] ??
                    props.payload.bucket,
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
            Total guesses
            </span>
        </div>
        </div>

        {/* Legend (tight) */}
        <div className="mt-2 space-y-0.5 text-[14px] text-gray-300 leading-tight">
        <div>🔥 Hot: score ≥ 70 (very similar to the secret word)</div>
        <div>🌤️ Warm: 40 ≤ score &lt; 70 (moderately similar)</div>
        <div>❄️ Cold: 15 ≤ score &lt; 40 (low similarity) </div>
        <div>🧊 Frozen: score &lt; 15 (almost unrelated)</div>

        <div className="mt-1 text-[14px] text-gray-500">
            Score is computed from cosine similarity of word embeddings and normalized into a 0–99 range.
        </div>
        </div>
    </div>
    );
}
