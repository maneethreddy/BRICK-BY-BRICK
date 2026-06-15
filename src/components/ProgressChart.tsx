import { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import type { Habit, DailyCompletions } from '../hooks/useHabits';
import { getScheduledHabitsForDate } from '../hooks/useHabits';
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

    return dates.map(date => {
      const dateStr = formatDateKey(date);
      const isFuture = date > today;

      // Get only habits scheduled for this day
      const scheduled = getScheduledHabitsForDate(habits, date);
      const dayCompletions = completions[dateStr] || [];
      const validCompletions = dayCompletions.filter(id => scheduled.some(h => h.id === id)).length;
      
      // If rest day (no habits scheduled), treat as 100% so graph doesn't dip
      const rate = scheduled.length > 0 && !isFuture
        ? Math.round((validCompletions / scheduled.length) * 100) 
        : scheduled.length === 0 ? null : null; // null for future and rest days

      return {
        day: date.getDate(),
        dateStr,
        rate,
        completionsCount: validCompletions,
        scheduledCount: scheduled.length,
        isRestDay: scheduled.length === 0,
        isFuture
      };
    });
  }, [habits, completions, selectedYear, selectedMonth]);

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.isFuture) return null;
      return (
        <div className="p-3 rounded-xl border border-white/10 bg-gray-950/90 backdrop-blur-md shadow-2xl text-xs">
          <p className="font-bold text-gray-200 mb-1">Day {data.day}</p>
          {data.isRestDay ? (
            <p className="text-gray-400 italic">Rest day — no habits scheduled</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              <p className="text-gray-400">
                Completion Rate: <span className="text-emerald-400 font-extrabold">{data.rate}%</span>
              </p>
              <p className="text-gray-500">
                Completed: {data.completionsCount} of {data.scheduledCount} scheduled
              </p>
            </div>
          )}
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
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Daily Progress Trend</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          Target: {monthlyGoal}%
        </div>
      </div>

      <div className="w-full h-64 sm:h-72 pr-2 sm:pr-4 pt-4">
        {habits.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            Add habits to see your monthly progress chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="rgba(255, 255, 255, 0.05)" 
              />
              <XAxis 
                dataKey="day" 
                stroke="#6b7280" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Highlight the target goal line */}
              <ReferenceLine 
                y={monthlyGoal} 
                stroke="rgba(16, 185, 129, 0.3)" 
                strokeDasharray="4 4" 
              />

              <Line
                type="monotone"
                dataKey="rate"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 2, stroke: '#10b981', strokeWidth: 1, fill: '#070c09' }}
                activeDot={{ r: 5, stroke: '#34d399', strokeWidth: 2, fill: '#ffffff' }}
                animationDuration={1000}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
