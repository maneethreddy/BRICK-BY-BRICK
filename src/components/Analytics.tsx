import { useMemo } from 'react';
import type { Habit, DailyCompletions } from '../hooks/useHabits';
import { getScheduledHabitsForDate } from '../hooks/useHabits';
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
      return {
        bestHabit: null,
        worstHabit: null,
        consistencyRate: 0,
        totalCompletedDays: 0,
        avgDailyCompletion: 0
      };
    }

    const dates = getDatesInMonth(selectedYear, selectedMonth);
    const today = new Date();
    
    // Per-habit completion counters (vs scheduled days only)
    const habitScheduledCount: { [id: string]: number } = {};
    const habitCompletedCount: { [id: string]: number } = {};
    habits.forEach(h => {
      habitScheduledCount[h.id] = 0;
      habitCompletedCount[h.id] = 0;
    });

    let scheduledActiveDays = 0; // Days with at least 1 habit scheduled & elapsed
    let completedActiveDays = 0; // Days with at least 1 scheduled habit completed
    let sumDailyPercentages = 0;

    dates.forEach(date => {
      const dateStr = formatDateKey(date);
      const isFuture = date > today;
      if (isFuture) return;

      const scheduledForDay = getScheduledHabitsForDate(habits, date);
      if (scheduledForDay.length === 0) return; // skip rest days from averages

      scheduledActiveDays++;

      const dayCompletions = completions[dateStr] || [];
      const validCompletions = dayCompletions.filter(id => scheduledForDay.some(h => h.id === id));

      // Per-habit tallying
      scheduledForDay.forEach(h => {
        habitScheduledCount[h.id]++;
        if (validCompletions.includes(h.id)) {
          habitCompletedCount[h.id]++;
        }
      });

      // Track completed days
      if (validCompletions.length > 0) {
        completedActiveDays++;
      }

      // Track sum of daily completion rate (scheduled only)
      const dailyRate = (validCompletions.length / scheduledForDay.length) * 100;
      sumDailyPercentages += dailyRate;
    });

    // Best & worst habits (by completion rate over scheduled days)
    let bestHabitId = '';
    let bestRate = -1;
    let worstHabitId = '';
    let worstRate = Infinity;

    Object.keys(habitScheduledCount).forEach(id => {
      if (habitScheduledCount[id] === 0) return;
      const rate = habitCompletedCount[id] / habitScheduledCount[id];
      if (rate > bestRate) { bestRate = rate; bestHabitId = id; }
      if (rate < worstRate) { worstRate = rate; worstHabitId = id; }
    });

    const bestHabit = habits.find(h => h.id === bestHabitId) || null;
    const worstHabit = habits.find(h => h.id === worstHabitId) || null;
    const bestHabitCount = habitCompletedCount[bestHabitId] ?? 0;
    const worstHabitCount = habitCompletedCount[worstHabitId] ?? 0;

    // Consistency Rate: days with at least 1 scheduled completion / all scheduled active days
    const consistencyRate = scheduledActiveDays > 0
      ? Math.round((completedActiveDays / scheduledActiveDays) * 100)
      : 0;

    // Average Daily Completion Rate (over scheduled active days)
    const avgDailyCompletion = scheduledActiveDays > 0
      ? Math.round(sumDailyPercentages / scheduledActiveDays)
      : 0;

    return {
      bestHabit: bestRate > 0 ? { habit: bestHabit, count: bestHabitCount } : null,
      worstHabit: worstRate < Infinity && habits.length > 1 ? { habit: worstHabit, count: worstHabitCount } : null,
      consistencyRate,
      totalCompletedDays: completedActiveDays,
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
      subtext: `${totalCompletedDays} active days logged`,
      icon: <CalendarCheck className="w-5 h-5 text-emerald-400" />,
      colorClass: "text-emerald-400"
    },
    {
      title: "Avg Daily Score",
      value: `${avgDailyCompletion}%`,
      subtext: "Avg of scheduled days only",
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
            <div
              key={idx}
              className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors"
            >
              <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  {item.title}
                </span>
                <span className={`text-base font-extrabold truncate block mt-0.5 ${item.colorClass}`}>
                  {item.value}
                </span>
                <span className="text-xs text-gray-400 block mt-0.5 truncate font-medium">
                  {item.subtext}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
