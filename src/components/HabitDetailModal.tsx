import { useMemo } from 'react';
import { X, Flame, Trophy, CheckCircle2, CalendarDays, Target, Repeat } from 'lucide-react';
import type { Habit, DailyCompletions } from '../hooks/useHabits';
import { DAILY_SCHEDULE, countCompletionsInWeek, getWeekStart } from '../hooks/useHabits';
import { formatDateKey, getHeatmapDates, getDatesInMonth } from '../utils/dateUtils';

interface HabitDetailModalProps {
  habit: Habit;
  completions: DailyCompletions;
  onClose: () => void;
}

const WEEKDAY_LABELS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatSchedule = (schedule: number[], timesPerWeek: number): string => {
  const sorted = [...schedule].sort();
  if (timesPerWeek === 7) return 'Every day';
  if (sorted.join(',') === '1,2,3,4,5') return 'Mon – Fri';
  if (sorted.join(',') === '0,6') return 'Sat & Sun';
  if (sorted.length === timesPerWeek && sorted.length < 7) {
    return sorted.map(d => WEEKDAY_LABELS_SHORT[d]).join(', ');
  }
  return `${timesPerWeek}× / week`;
};

// ─── Per-habit heatmap ────────────────────────────────────────────────────────

const HabitHeatmap = ({
  habit,
  completions,
  selectedYear
}: {
  habit: Habit;
  completions: DailyCompletions;
  selectedYear: number;
}) => {
  const dates = useMemo(() => getHeatmapDates(selectedYear), [selectedYear]);
  const preferredDays = habit.schedule ?? DAILY_SCHEDULE;

  const dateCellData = useMemo(() => {
    const result: { [k: string]: { completed: boolean; preferred: boolean } } = {};
    dates.forEach(date => {
      const dateStr = formatDateKey(date);
      const isPreferred = preferredDays.includes(date.getDay());
      const dayCompletions = completions[dateStr] || [];
      result[dateStr] = {
        preferred: isPreferred,
        completed: dayCompletions.includes(habit.id)
      };
    });
    return result;
  }, [dates, completions, habit, preferredDays]);

  const monthLabels = useMemo(() => {
    const labels: { text: string; colIndex: number }[] = [];
    let lastMonth = -1;
    for (let i = 0; i < dates.length; i += 7) {
      const weekDates = dates.slice(i, i + 7);
      const targetDate = weekDates.find(d => d.getFullYear() === selectedYear) || weekDates[0];
      const month = targetDate.getMonth();
      if (month !== lastMonth) {
        labels.push({ text: targetDate.toLocaleString('default', { month: 'short' }), colIndex: i / 7 });
        lastMonth = month;
      }
    }
    return labels;
  }, [dates, selectedYear]);

  const getCellClass = (dateStr: string, isFuture: boolean) => {
    if (isFuture) return 'bg-white/[0.01] border-white/[0.01]';
    const data = dateCellData[dateStr];
    if (!data) return 'bg-white/[0.03] border-white/[0.02]';
    if (data.completed) return 'bg-emerald-400 border-emerald-300/30';
    if (data.preferred) return 'bg-white/[0.05] border-emerald-500/15'; // preferred but missed
    return 'bg-white/[0.03] border-white/[0.02]';
  };

  return (
    <div className="flex flex-col overflow-x-auto hide-scrollbar select-none py-1">
      <div className="min-w-max flex flex-col gap-1.5">
        <div className="flex text-[10px] text-gray-500 font-semibold h-4 relative pl-8">
          {monthLabels.map((label, idx) => (
            <span key={idx} className="absolute" style={{ left: `${(label.colIndex * 14) + 32}px` }}>
              {label.text}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col justify-between text-[9px] text-gray-500 font-semibold h-[86px] w-6 py-0.5 select-none leading-none">
            <span>Sun</span><span>Tue</span><span>Thu</span><span>Sat</span>
          </div>
          <div className="grid grid-rows-7 grid-flow-col gap-1 h-[86px]">
            {dates.map((date, index) => {
              const dateStr = formatDateKey(date);
              const todayMidnight = new Date();
              todayMidnight.setHours(0, 0, 0, 0);
              const isFuture = date.getTime() > todayMidnight.getTime();
              const data = dateCellData[dateStr];
              const formattedDate = date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <div key={index} className="group relative">
                  <div className={`w-2.5 h-2.5 rounded-[2px] border transition-colors cursor-default ${getCellClass(dateStr, isFuture)}`} />
                  {!isFuture && data && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                      <div className="bg-gray-950 border border-white/10 px-2 py-1 rounded-md text-[10px] font-bold text-gray-200 shadow-xl whitespace-nowrap">
                        <span className={data.completed ? 'text-emerald-400' : 'text-gray-400'}>
                          {data.completed ? '✓ Completed' : data.preferred ? '○ Preferred — missed' : '· Not logged'}
                        </span>
                        <div className="text-gray-500 font-medium text-[9px] mt-0.5">{formattedDate}</div>
                      </div>
                      <div className="w-1.5 h-1.5 bg-gray-950 border-r border-b border-white/10 rotate-45 absolute top-full left-1/2 -translate-x-1/2 -translate-y-[4px]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500 pl-8 mt-1">
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-300/30" /><span>Completed</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-[2px] bg-white/[0.05] border border-emerald-500/15" /><span>Preferred day missed</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-[2px] bg-white/[0.03] border border-white/[0.02]" /><span>Not logged</span></div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

export const HabitDetailModal = ({ habit, completions, onClose }: HabitDetailModalProps) => {
  const schedule = habit.schedule ?? DAILY_SCHEDULE;
  const timesPerWeek = habit.timesPerWeek ?? schedule.length ?? 7;
  const scheduleLabel = formatSchedule(schedule, timesPerWeek);
  const selectedYear = new Date().getFullYear();

  const stats = useMemo(() => {
    const today = new Date();

    const isDone = (date: Date) => {
      const dateStr = formatDateKey(date);
      return (completions[dateStr] || []).includes(habit.id);
    };

    // ── 1. Current Streak (consecutive days with any completion) ──────────────
    let currentStreak = 0;
    {
      const hasSomethingToday = isDone(today);
      const startOffset = hasSomethingToday ? 0 : 1;
      for (let offset = startOffset; offset < 400; offset++) {
        const d = new Date(today);
        d.setDate(today.getDate() - offset);
        if (isDone(d)) currentStreak++;
        else break;
      }
    }

    // ── 2. Weekly Streak (consecutive weeks hitting timesPerWeek target) ──────
    let weeklyStreak = 0;
    {
      // Walk back week-by-week from the current week
      const weekOffset = (weekNum: number): Date => {
        const d = new Date(today);
        d.setDate(today.getDate() - weekNum * 7);
        return d;
      };

      for (let w = 0; w < 52; w++) {
        const weekDate = weekOffset(w);
        const done = countCompletionsInWeek(habit.id, weekDate, completions);
        if (done >= timesPerWeek) {
          weeklyStreak++;
        } else {
          // For current week that hasn't ended yet — allow partial (at least 1 done)
          if (w === 0 && done > 0) {
            // Current week in progress — don't break the streak
            continue;
          }
          break;
        }
      }
    }

    // ── 3. Longest weekly streak ──────────────────────────────────────────────
    let longestWeeklyStreak = 0;
    {
      const yearStart = new Date(selectedYear, 0, 1);
      let tempStreak = 0;
      // Walk week by week from year start to today
      const cursor = new Date(getWeekStart(yearStart));
      while (cursor <= today) {
        const done = countCompletionsInWeek(habit.id, cursor, completions);
        if (done >= timesPerWeek) {
          tempStreak++;
          longestWeeklyStreak = Math.max(longestWeeklyStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
        cursor.setDate(cursor.getDate() + 7);
      }
    }

    // ── 4. All-time completion rate (completions / timesPerWeek per week) ─────
    let totalCompleted = 0;
    let totalScheduledOpportunities = 0;
    {
      const earliest = habit.createdAt ? new Date(habit.createdAt) : new Date(selectedYear, 0, 1);
      const cursor = new Date(getWeekStart(earliest));
      while (cursor <= today) {
        const done = countCompletionsInWeek(habit.id, cursor, completions);
        totalCompleted += done;
        totalScheduledOpportunities += timesPerWeek;
        cursor.setDate(cursor.getDate() + 7);
      }
    }
    const allTimeRate = totalScheduledOpportunities > 0
      ? Math.min(100, Math.round((totalCompleted / totalScheduledOpportunities) * 100))
      : 0;

    // ── 5. This month ─────────────────────────────────────────────────────────
    const now = new Date();
    const dates = getDatesInMonth(now.getFullYear(), now.getMonth());
    let monthCompleted = 0;
    dates.forEach(date => {
      if (date > today) return;
      if (isDone(date)) monthCompleted++;
    });
    const elapsedWeeks = now.getDate() / 7;
    const expectedMonthCompletions = timesPerWeek * elapsedWeeks;
    const monthRate = expectedMonthCompletions > 0
      ? Math.min(100, Math.round((monthCompleted / expectedMonthCompletions) * 100))
      : 0;

    // ── 6. This week count ────────────────────────────────────────────────────
    const thisWeekCount = countCompletionsInWeek(habit.id, today, completions);

    return {
      currentStreak,
      weeklyStreak,
      longestWeeklyStreak: Math.max(longestWeeklyStreak, weeklyStreak),
      allTimeRate,
      monthRate,
      monthCompleted,
      totalCompleted,
      thisWeekCount
    };
  }, [habit, completions, timesPerWeek, selectedYear]);

  const statCards = [
    {
      icon: <Flame className="w-5 h-5 text-amber-400" />,
      label: 'Day Streak',
      value: `${stats.currentStreak}`,
      unit: stats.currentStreak === 1 ? 'day' : 'days',
      sub: stats.currentStreak > 0 ? "Consecutive days logged 🔥" : "Log today to start!",
      color: 'text-amber-400',
      border: 'hover:border-amber-500/30'
    },
    {
      icon: <Trophy className="w-5 h-5 text-yellow-400" />,
      label: 'Weekly Streak',
      value: `${stats.weeklyStreak}`,
      unit: stats.weeklyStreak === 1 ? 'week' : 'weeks',
      sub: `Best: ${stats.longestWeeklyStreak}w — hit ${timesPerWeek}×/wk`,
      color: 'text-yellow-400',
      border: 'hover:border-yellow-500/30'
    },
    {
      icon: <Repeat className="w-5 h-5 text-violet-400" />,
      label: 'This Week',
      value: `${stats.thisWeekCount}`,
      unit: `/ ${timesPerWeek}`,
      sub: stats.thisWeekCount >= timesPerWeek ? 'Week target met! 🎉' : `${timesPerWeek - stats.thisWeekCount} more to hit target`,
      color: stats.thisWeekCount >= timesPerWeek ? 'text-emerald-400' : 'text-violet-400',
      border: stats.thisWeekCount >= timesPerWeek ? 'hover:border-emerald-500/30' : 'hover:border-violet-500/30',
      progress: Math.min(100, Math.round((stats.thisWeekCount / timesPerWeek) * 100))
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      label: 'This Month',
      value: `${stats.monthRate}%`,
      unit: '',
      sub: `${stats.monthCompleted} completions this month`,
      color: 'text-emerald-400',
      border: 'hover:border-emerald-500/30',
      progress: stats.monthRate
    },
    {
      icon: <Target className="w-5 h-5 text-pink-400" />,
      label: 'All-Time Rate',
      value: `${stats.allTimeRate}%`,
      unit: '',
      sub: `${stats.totalCompleted} total completions`,
      color: 'text-pink-400',
      border: 'hover:border-pink-500/30',
      progress: stats.allTimeRate
    },
    {
      icon: <CalendarDays className="w-5 h-5 text-blue-400" />,
      label: 'Frequency',
      value: `${timesPerWeek}`,
      unit: 'days/week',
      sub: scheduleLabel,
      color: 'text-blue-400',
      border: 'hover:border-blue-500/30'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-white/10 glass-panel shadow-2xl relative z-10 max-h-[92vh] overflow-y-auto animate-zoom-in">
        {/* Header */}
        <div className="flex justify-between items-start px-5 pt-6 pb-4 border-b border-white/5 sticky top-0 glass-panel z-10">
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 sm:hidden" />

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-emerald-400/10 border border-emerald-500/20 flex items-center justify-center text-2xl flex-shrink-0">
              {habit.emoji}
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{habit.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
                  {scheduleLabel}
                </span>
                <span className="text-xs text-gray-500 font-medium">{timesPerWeek}×/week</span>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-6">
          {/* Analytics Grid */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Analytics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {statCards.map((card, i) => (
                <div
                  key={i}
                  className={`group flex flex-col justify-between p-4 rounded-xl glass-panel border border-white/5 transition-all duration-300 hover:translate-y-[-1px] ${card.border}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{card.label}</span>
                    <div className="p-1.5 rounded-lg bg-white/5 group-hover:scale-110 transition-transform">
                      {card.icon}
                    </div>
                  </div>
                  <div>
                    <span className={`text-2xl font-extrabold tracking-tight ${card.color}`}>
                      {card.value}
                      {card.unit && <span className="text-sm font-semibold text-gray-400 ml-1">{card.unit}</span>}
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{card.sub}</p>
                  </div>
                  {card.progress !== undefined && (
                    <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${card.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preferred days display */}
          {schedule.length < 7 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Preferred Days</h3>
              <div className="flex gap-2 flex-wrap">
                {WEEKDAY_LABELS_FULL.map((label, idx) => {
                  const isPreferred = schedule.includes(idx);
                  return (
                    <div
                      key={idx}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        isPreferred
                          ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/[0.02] border-white/5 text-gray-600'
                      }`}
                    >
                      {label.slice(0, 3)}
                      {!isPreferred && <span className="ml-1 text-[9px] text-gray-700">not preferred</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-600 mt-2">
                ⚡ Completing on non-preferred days still counts towards your {timesPerWeek}×/week target.
              </p>
            </div>
          )}

          {/* Yearly Heatmap */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              {selectedYear} Contribution Map
            </h3>
            <HabitHeatmap habit={habit} completions={completions} selectedYear={selectedYear} />
          </div>
        </div>
      </div>
    </div>
  );
};
