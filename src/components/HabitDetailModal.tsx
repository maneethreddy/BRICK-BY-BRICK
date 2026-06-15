import { useMemo } from 'react';
import { X, Flame, Trophy, CheckCircle2, CalendarDays, Hash, Target } from 'lucide-react';
import type { Habit, DailyCompletions } from '../hooks/useHabits';
import { DAILY_SCHEDULE } from '../hooks/useHabits';
import { formatDateKey, getHeatmapDates, getDatesInMonth } from '../utils/dateUtils';

interface HabitDetailModalProps {
  habit: Habit;
  completions: DailyCompletions;
  onClose: () => void;
}

const WEEKDAY_LABELS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Format schedule as human-readable string */
const formatSchedule = (schedule: number[]): string => {
  const sorted = [...schedule].sort();
  if (sorted.join(',') === '0,1,2,3,4,5,6') return 'Every day';
  if (sorted.join(',') === '1,2,3,4,5') return 'Mon – Fri';
  if (sorted.join(',') === '0,6') return 'Sat & Sun';
  return sorted.map(d => WEEKDAY_LABELS_SHORT[d]).join(', ');
};

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
  const schedule = habit.schedule ?? DAILY_SCHEDULE;

  const dateCellData = useMemo(() => {
    const result: { [k: string]: { completed: boolean; scheduled: boolean } } = {};
    dates.forEach(date => {
      const dateStr = formatDateKey(date);
      const isScheduled = schedule.includes(date.getDay());
      const dayCompletions = completions[dateStr] || [];
      result[dateStr] = {
        scheduled: isScheduled,
        completed: dayCompletions.includes(habit.id)
      };
    });
    return result;
  }, [dates, completions, habit, schedule]);

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
    if (!data.scheduled) return 'bg-white/[0.015] border-white/[0.01] opacity-30';
    if (data.completed) return 'bg-emerald-400 border-emerald-300/30';
    return 'bg-white/[0.05] border-white/10';
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
            <span>Sun</span>
            <span>Tue</span>
            <span>Thu</span>
            <span>Sat</span>
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
                  <div
                    className={`w-2.5 h-2.5 rounded-[2px] border transition-colors cursor-default ${getCellClass(dateStr, isFuture)}`}
                  />
                  {!isFuture && data && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                      <div className="bg-gray-950 border border-white/10 px-2 py-1 rounded-md text-[10px] font-bold text-gray-200 shadow-xl whitespace-nowrap">
                        {!data.scheduled ? (
                          <span className="text-gray-500 italic">Rest day</span>
                        ) : (
                          <span className={data.completed ? 'text-emerald-400' : 'text-gray-400'}>
                            {data.completed ? '✓ Completed' : '✗ Missed'}
                          </span>
                        )}
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
        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500 pl-8 mt-1">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-300/30" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-white/[0.05] border border-white/10" />
            <span>Missed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-white/[0.015] border border-white/[0.01] opacity-30" />
            <span>Rest day</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HabitDetailModal = ({ habit, completions, onClose }: HabitDetailModalProps) => {
  const schedule = habit.schedule ?? DAILY_SCHEDULE;
  const scheduleLabel = formatSchedule(schedule);
  const daysPerWeek = schedule.length;
  const selectedYear = new Date().getFullYear();

  // Compute per-habit analytics
  const stats = useMemo(() => {
    const today = new Date();

    // --- Helper: is a date scheduled for THIS habit? ---
    const isScheduled = (date: Date) => schedule.includes(date.getDay());
    const isCompleted = (date: Date) => {
      const dateStr = formatDateKey(date);
      return (completions[dateStr] || []).includes(habit.id);
    };

    // 1. Current Streak — walk backward, skip unscheduled days
    let currentStreak = 0;
    {
      let offset = 0;
      // If today is scheduled but not yet done, start from yesterday
      const todayScheduled = isScheduled(today);
      const todayDone = isCompleted(today);
      if (todayScheduled && !todayDone) offset = 1;

      let cap = 0;
      while (cap < 400) {
        const d = new Date(today);
        d.setDate(today.getDate() - offset);
        if (!isScheduled(d)) { offset++; cap++; continue; }
        if (isCompleted(d)) { currentStreak++; offset++; cap++; }
        else break;
      }
    }

    // 2. Longest Streak
    let longestStreak = 0;
    {
      // Get all dates in selected year as candidates
      const yearDates: Date[] = [];
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(selectedYear, m + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          yearDates.push(new Date(selectedYear, m, d));
        }
      }

      let tempStreak = 0;
      for (const date of yearDates) {
        if (date > today) break;
        if (!isScheduled(date)) continue;
        if (isCompleted(date)) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
    }

    // 3. All-time completion rate
    let totalScheduled = 0;
    let totalCompleted = 0;
    const earliest = habit.createdAt ? new Date(habit.createdAt) : new Date(selectedYear, 0, 1);
    const cursor = new Date(earliest);
    cursor.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(today);
    todayMidnight.setHours(23, 59, 59, 999);

    while (cursor <= todayMidnight) {
      if (isScheduled(cursor)) {
        totalScheduled++;
        if (isCompleted(cursor)) totalCompleted++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    const allTimeRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

    // 4. This month rate
    const now = new Date();
    const dates = getDatesInMonth(now.getFullYear(), now.getMonth());
    let monthScheduled = 0;
    let monthCompleted = 0;
    dates.forEach(date => {
      if (date > today) return;
      if (!isScheduled(date)) return;
      monthScheduled++;
      if (isCompleted(date)) monthCompleted++;
    });
    const monthRate = monthScheduled > 0 ? Math.round((monthCompleted / monthScheduled) * 100) : 0;

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      allTimeRate,
      monthRate,
      monthCompleted,
      monthScheduled,
      totalCompleted,
      totalScheduled
    };
  }, [habit, completions, schedule, selectedYear]);

  const statCards = [
    {
      icon: <Flame className="w-5 h-5 text-amber-400" />,
      label: 'Current Streak',
      value: `${stats.currentStreak}`,
      unit: stats.currentStreak === 1 ? 'day' : 'days',
      sub: stats.currentStreak > 0 ? "Keep it up! 🔥" : "Start today!",
      color: 'text-amber-400',
      border: 'hover:border-amber-500/30'
    },
    {
      icon: <Trophy className="w-5 h-5 text-yellow-400" />,
      label: 'Longest Streak',
      value: `${stats.longestStreak}`,
      unit: stats.longestStreak === 1 ? 'day' : 'days',
      sub: 'Personal best 🏆',
      color: 'text-yellow-400',
      border: 'hover:border-yellow-500/30'
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      label: 'This Month',
      value: `${stats.monthRate}%`,
      unit: '',
      sub: `${stats.monthCompleted} of ${stats.monthScheduled} scheduled days`,
      color: 'text-emerald-400',
      border: 'hover:border-emerald-500/30',
      progress: stats.monthRate
    },
    {
      icon: <Target className="w-5 h-5 text-pink-400" />,
      label: 'All-Time Rate',
      value: `${stats.allTimeRate}%`,
      unit: '',
      sub: `${stats.totalCompleted} of ${stats.totalScheduled} days`,
      color: 'text-pink-400',
      border: 'hover:border-pink-500/30',
      progress: stats.allTimeRate
    },
    {
      icon: <Hash className="w-5 h-5 text-blue-400" />,
      label: 'Total Completions',
      value: `${stats.totalCompleted}`,
      unit: 'times',
      sub: 'All time ✅',
      color: 'text-blue-400',
      border: 'hover:border-blue-500/30'
    },
    {
      icon: <CalendarDays className="w-5 h-5 text-violet-400" />,
      label: 'Weekly Frequency',
      value: `${daysPerWeek}`,
      unit: 'days/week',
      sub: scheduleLabel,
      color: 'text-violet-400',
      border: 'hover:border-violet-500/30'
    }
  ];

  // Close on overlay click
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet/Dialog */}
      <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-white/10 glass-panel shadow-2xl relative z-10 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start px-5 pt-6 pb-4 border-b border-white/5 sticky top-0 glass-panel z-10">
          {/* Mobile drag handle */}
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
                <span className="text-xs text-gray-500 font-medium">{daysPerWeek}d/week</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
            aria-label="Close"
          >
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
                  className={`group relative flex flex-col justify-between p-4 rounded-xl glass-panel border border-white/5 transition-all duration-300 hover:translate-y-[-1px] ${card.border}`}
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
                    <p className="text-[11px] text-gray-500 mt-0.5 font-medium truncate">{card.sub}</p>
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

          {/* Schedule Tags */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Active Days</h3>
            <div className="flex gap-2 flex-wrap">
              {WEEKDAY_LABELS_FULL.map((label, idx) => {
                const isActive = schedule.includes(idx);
                return (
                  <div
                    key={idx}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      isActive
                        ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-white/[0.02] border-white/5 text-gray-600'
                    }`}
                  >
                    {label.slice(0, 3)}
                    {!isActive && <span className="ml-1 text-[9px] text-gray-700">off</span>}
                  </div>
                );
              })}
            </div>
          </div>

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
