import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface WinSpeedItem 
{
  label: string;
  count: number;
}

interface Props {
  data: WinSpeedItem[];
}

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#a855f7", "#22c55e"];

export function WinSpeedBarChart({ data }: Props) {
  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value: number) => [`${value} games`, '']} />
          <Bar dataKey="count">
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}