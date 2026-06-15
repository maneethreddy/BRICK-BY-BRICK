import { useMemo } from 'react';
import type { Habit, DailyCompletions } from '../hooks/useHabits';
import { getDatesInMonth, formatDateKey } from '../utils/dateUtils';
import { BarChart3, Sparkles, AlertTriangle, CalendarCheck, Percent } from 'lucide-react';

interface AnalyticsProps {
  habits: Habit[];
  completions: DailyCompletions;
  selectedYear: number;
  selectedMonth: number;
}

export const Analytics = ({
  habits,
  completions,
  selectedYear,
  selectedMonth
}: AnalyticsProps) => {
  const analyticsData = useMemo(() => {
    if (habits.length === 0) {
      return { bestHabit: null, worstHabit: null, consistencyRate: 0, totalCompletedDays: 0, avgDailyCompletion: 0 };
    }

    const dates = getDatesInMonth(selectedYear, selectedMonth);
    const today = new Date();
    const elapsedDays = selectedYear === today.getFullYear() && selectedMonth === today.getMonth()
      ? today.getDate()
      : (selectedYear > today.getFullYear() || (selectedYear === today.getFullYear() && selectedMonth > today.getMonth()))
        ? 0
        : dates.length;

    if (elapsedDays === 0) {
      return { bestHabit: null, worstHabit: null, consistencyRate: 0, totalCompletedDays: 0, avgDailyCompletion: 0 };
    }

    // Per-habit: count completions in the selected month
    const habitCompletionCounts: { [id: string]: number } = {};
    habits.forEach(h => { habitCompletionCounts[h.id] = 0; });

    let totalCompletedDays = 0;
    let sumDailyPercentages = 0;

    dates.forEach(date => {
      const dayNum = date.getDate();
      if (dayNum > elapsedDays) return;

      const dateStr = formatDateKey(date);
      const dayCompletions = completions[dateStr] || [];
      const validCompletions = dayCompletions.filter(id => habits.some(h => h.id === id));

      validCompletions.forEach(id => {
        if (habitCompletionCounts[id] !== undefined) habitCompletionCounts[id]++;
      });

      if (validCompletions.length > 0) totalCompletedDays++;

      // Daily score: average of each habit's weekly progress
      // Simplified: completions that day vs average daily target
      const avgDailyTarget = habits.reduce((sum, h) => sum + (h.timesPerWeek / 7), 0);
      const dailyRate = avgDailyTarget > 0
        ? Math.min(100, (validCompletions.length / avgDailyTarget) * 100)
        : 0;
      sumDailyPercentages += dailyRate;
    });

    // Best/worst by completion count this month
    let bestHabitId = '';
    let maxCount = -1;
    let worstHabitId = '';
    let minCount = Infinity;

    Object.keys(habitCompletionCounts).forEach(id => {
      const count = habitCompletionCounts[id];
      if (count > maxCount) { maxCount = count; bestHabitId = id; }
      if (count < minCount) { minCount = count; worstHabitId = id; }
    });

    const bestHabit = habits.find(h => h.id === bestHabitId) || null;
    const worstHabit = habits.find(h => h.id === worstHabitId) || null;

    const consistencyRate = elapsedDays > 0 ? Math.round((totalCompletedDays / elapsedDays) * 100) : 0;
    const avgDailyCompletion = elapsedDays > 0 ? Math.round(sumDailyPercentages / elapsedDays) : 0;

    return {
      bestHabit: maxCount > 0 ? { habit: bestHabit, count: maxCount } : null,
      worstHabit: minCount < Infinity && habits.length > 1 ? { habit: worstHabit, count: minCount } : null,
      consistencyRate,
      totalCompletedDays,
      avgDailyCompletion
    };
  }, [habits, completions, selectedYear, selectedMonth]);

  const { bestHabit, worstHabit, consistencyRate, totalCompletedDays, avgDailyCompletion } = analyticsData;

  const statItems = [
    {
      title: "Best Habit",
      value: bestHabit ? `${bestHabit.habit?.emoji} ${bestHabit.habit?.name}` : "N/A",
      subtext: bestHabit ? `${bestHabit.count} completions this month` : "No habits completed",
      icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
      colorClass: "text-emerald-400"
    },
    {
      title: "Needs Attention",
      value: worstHabit ? `${worstHabit.habit?.emoji} ${worstHabit.habit?.name}` : "N/A",
      subtext: worstHabit ? `${worstHabit.count} completions this month` : "N/A",
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
      colorClass: "text-rose-400"
    },
    {
      title: "Consistency",
      value: `${consistencyRate}%`,
      subtext: `${totalCompletedDays} days with at least 1 check`,
      icon: <CalendarCheck className="w-5 h-5 text-emerald-400" />,
      colorClass: "text-emerald-400"
    },
    {
      title: "Avg Daily Score",
      value: `${avgDailyCompletion}%`,
      subtext: "Avg completions vs daily target",
      icon: <Percent className="w-5 h-5 text-pink-400" />,
      colorClass: "text-pink-400"
    }
  ];

  return (
    <div className="flex flex-col gap-4 p-5 sm:p-6 rounded-2xl glass-panel border border-white/5">
      <div className="flex items-center gap-2 border-b border-white/5 pb-4">
        <BarChart3 className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Monthly Insights</h2>
      </div>

      {habits.length === 0 ? (
        <div className="py-8 text-center text-gray-500 text-sm">
          Add habits to see monthly analytics.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">{item.title}</span>
                <span className={`text-base font-extrabold truncate block mt-0.5 ${item.colorClass}`}>{item.value}</span>
                <span className="text-xs text-gray-400 block mt-0.5 truncate font-medium">{item.subtext}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
