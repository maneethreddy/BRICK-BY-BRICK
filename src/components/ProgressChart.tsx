import { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import type { Habit, DailyCompletions } from '../hooks/useHabits';
import { getDatesInMonth, formatDateKey } from '../utils/dateUtils';
import { TrendingUp } from 'lucide-react';

interface ProgressChartProps {
  habits: Habit[];
  completions: DailyCompletions;
  selectedYear: number;
  selectedMonth: number;
  monthlyGoal: number;
}

export const ProgressChart = ({
  habits,
  completions,
  selectedYear,
  selectedMonth,
  monthlyGoal
}: ProgressChartProps) => {
  const chartData = useMemo(() => {
    const dates = getDatesInMonth(selectedYear, selectedMonth);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return dates.map(date => {
      const dateStr = formatDateKey(date);
      const isFuture = date > today;

      if (isFuture || habits.length === 0) {
        return { day: date.getDate(), dateStr, rate: null, done: 0, total: habits.length };
      }

      // Count how many habits were checked on this specific day
      const dayCompletions = completions[dateStr] || [];
      const done = dayCompletions.filter(id => habits.some(h => h.id === id)).length;
      const rate = Math.round((done / habits.length) * 100);

      return { day: date.getDate(), dateStr, rate, done, total: habits.length };
    });
  }, [habits, completions, selectedYear, selectedMonth]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.rate === null) return null;
      return (
        <div className="p-3 rounded-xl border border-white/10 bg-gray-950/95 backdrop-blur-md shadow-2xl text-xs">
          <p className="font-bold text-gray-300 mb-1.5">
            {new Date(selectedYear, selectedMonth, data.day).toLocaleDateString('default', {
              weekday: 'short', month: 'short', day: 'numeric'
            })}
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-gray-400">
              Completed: <span className="text-emerald-400 font-extrabold">{data.done}</span>
              <span className="text-gray-500"> / {data.total} habits</span>
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
            <span className="text-gray-500">
              Score: <span className="text-white font-bold">{data.rate}%</span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4 p-5 sm:p-6 rounded-2xl glass-panel border border-white/5">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Daily Progress</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          Goal: {monthlyGoal}%
        </div>
      </div>

      <div className="w-full h-64 sm:h-72 pr-1 pt-2">
        {habits.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            Add habits to see your daily progress chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.04)"
              />
              <XAxis
                dataKey="day"
                stroke="#4b5563"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                stroke="#4b5563"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />

              {/* Target line */}
              <ReferenceLine
                y={monthlyGoal}
                stroke="rgba(16,185,129,0.35)"
                strokeDasharray="5 4"
                label={{ value: `${monthlyGoal}%`, position: 'insideTopRight', fill: '#10b981', fontSize: 9, fontWeight: 700 }}
              />

              {/* Area fill */}
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#emeraldGradient)"
                dot={false}
                activeDot={{ r: 5, stroke: '#34d399', strokeWidth: 2, fill: '#030e07' }}
                animationDuration={800}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary row */}
      {habits.length > 0 && (
        <div className="flex gap-3 pt-1 border-t border-white/5">
          {(() => {
            const past = chartData.filter(d => d.rate !== null);
            const avg = past.length > 0
              ? Math.round(past.reduce((s, d) => s + (d.rate ?? 0), 0) / past.length)
              : 0;
            const best = past.length > 0 ? Math.max(...past.map(d => d.rate ?? 0)) : 0;
            return (
              <>
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Monthly Avg</p>
                  <p className="text-lg font-extrabold text-white mt-0.5">{avg}%</p>
                </div>
                <div className="w-px bg-white/5" />
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Best Day</p>
                  <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{best}%</p>
                </div>
                <div className="w-px bg-white/5" />
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Days Logged</p>
                  <p className="text-lg font-extrabold text-white mt-0.5">{past.filter(d => (d.done ?? 0) > 0).length}</p>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
