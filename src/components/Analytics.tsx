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
    
    // Determine how many days have elapsed in the selected month
    let elapsedDays = dates.length;
    if (selectedYear === today.getFullYear() && selectedMonth === today.getMonth()) {
      elapsedDays = today.getDate(); // Up to today
    } else if (selectedYear > today.getFullYear() || (selectedYear === today.getFullYear() && selectedMonth > today.getMonth())) {
      elapsedDays = 0; // Future month
    }

    // 1. Calculate completions per habit
    const habitCompletionsCount: { [id: string]: number } = {};
    habits.forEach(h => {
      habitCompletionsCount[h.id] = 0;
    });

    let totalCompletedDays = 0;
    let sumDailyPercentages = 0;

    dates.forEach(date => {
      const dateStr = formatDateKey(date);
      const dayCompletions = completions[dateStr] || [];
      const validCompletions = dayCompletions.filter(id => habits.some(h => h.id === id));
      
      // Track counts per habit
      validCompletions.forEach(id => {
        if (habitCompletionsCount[id] !== undefined) {
          habitCompletionsCount[id]++;
        }
      });

      // Track completed days (days with at least 1 habit completed)
      const dayNum = date.getDate();
      const isPastOrToday = elapsedDays > 0 && dayNum <= elapsedDays;
      
      if (validCompletions.length > 0) {
        if (isPastOrToday) {
          totalCompletedDays++;
        }
      }

      // Track sum of daily completion rate
      if (isPastOrToday) {
        const dailyRate = (validCompletions.length / habits.length) * 100;
        sumDailyPercentages += dailyRate;
      }
    });

    // 2. Find best and worst habits
    let bestHabitId = '';
    let maxCompletions = -1;
    let worstHabitId = '';
    let minCompletions = Infinity;

    Object.keys(habitCompletionsCount).forEach(id => {
      const count = habitCompletionsCount[id];
      if (count > maxCompletions) {
        maxCompletions = count;
        bestHabitId = id;
      }
      if (count < minCompletions) {
        minCompletions = count;
        worstHabitId = id;
      }
    });

    const bestHabit = habits.find(h => h.id === bestHabitId) || null;
    const worstHabit = habits.find(h => h.id === worstHabitId) || null;

    // 3. Consistency Rate (Days with at least 1 completion / elapsed days)
    const consistencyRate = elapsedDays > 0
      ? Math.round((totalCompletedDays / elapsedDays) * 100)
      : 0;

    // 4. Average Daily Completion Rate
    const avgDailyCompletion = elapsedDays > 0
      ? Math.round(sumDailyPercentages / elapsedDays)
      : 0;

    return {
      bestHabit: maxCompletions > 0 ? { habit: bestHabit, count: maxCompletions } : null,
      worstHabit: minCompletions < Infinity && habits.length > 1 ? { habit: worstHabit, count: minCompletions } : null,
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
      title: "Worst Habit",
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
      title: "Average Daily Score",
      value: `${avgDailyCompletion}%`,
      subtext: "Average completed per day",
      icon: <Percent className="w-5 h-5 text-pink-400" />,
      colorClass: "text-pink-400"
    }
  ];

  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl glass-panel border border-white/5">
      <div className="flex items-center gap-2 border-b border-white/5 pb-4">
        <BarChart3 className="w-5 h-5 text-emerald-400" />
        <h2 className="text-xl font-bold text-white tracking-tight">Monthly Insights</h2>
      </div>

      {habits.length === 0 ? (
        <div className="py-8 text-center text-gray-500 text-sm">
          Add habits to see monthly analytics.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors"
            >
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
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
