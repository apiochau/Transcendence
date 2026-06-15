import { useMemo, useState } from "react";
import {PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector,
} from "recharts";

type DistributionItem = 
{
  rarity: string;
  count: number;
};

type Props = 
{
  data: DistributionItem[];
};


// 對應英文 label
const RARITY_LABELS: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

// 對應顏色
const COLORS: Record<string, string> = {
  common: "#94a3b8",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

export function CollectionRarityDonutChart({ data }: Props) {
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
                nameKey="rarity"
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
                {data.map((entry) => (
                    <Cell
                    key={entry.rarity}
                    fill={COLORS[entry.rarity] ?? "#94a3b8"}
                    />
                ))}
                </Pie>

            <Tooltip
                contentStyle={{
                borderRadius: "10px",
                border: "none",
                boxShadow: "0 4px 15px rgba(0,0,0,0.12)",
                }}
                // formatter={(value: number, _, props) => {
                // const percent = ((value / total) * 100).toFixed(1);
                // return [
                //     `${value} guesses (${percent}%)`,
                //     BUCKET_LABELS[props.payload.bucket] ??
                //     props.payload.bucket,
                // ];
                // }}
                formatter={(value: number, _, props) => {
                const percent = ((value / total) * 100).toFixed(1);

                return [
                    `${value} collected (${percent}%)`,
                    RARITY_LABELS[
                    props.payload.rarity
                    ] ?? props.payload.rarity,
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
            Total collected
            </span>
        </div>
        </div>

        {/* Legend (tight) */}
        <div className="mt-2 space-y-0.5 text-[14px] text-gray-300 leading-tight">
        <div>⚪ Common</div>
        <div>🟢 Uncommon</div>
        <div>🔵 Rare</div>
        <div>🟣 Epic</div>
        <div>🟡 Legendary</div>

        <div className="mt-1 text-[14px] text-gray-500">
            Distribution of all words owned by players.
        </div>
        </div>
    </div>
    );
}