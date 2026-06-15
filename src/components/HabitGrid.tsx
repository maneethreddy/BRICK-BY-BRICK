import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Plus, Calendar, BarChart2 } from 'lucide-react';
import type { Habit, DailyCompletions } from '../hooks/useHabits';
import { 
  formatDateKey, 
  getDatesInMonth, 
  MONTH_NAMES, 
  WEEKDAYS_SHORT,
  isDateLoggable
} from '../utils/dateUtils';
import { playCompleteSound } from '../utils/audio';
import confetti from 'canvas-confetti';

interface HabitGridProps {
  habits: Habit[];
  completions: DailyCompletions;
  toggleHabit: (id: string, dateStr: string) => boolean;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (id: string) => void;
  onAddHabit: () => void;
  onViewHabitDetail: (habit: Habit) => void;
  selectedYear: number;
  selectedMonth: number;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
  setSelectedMonth: React.Dispatch<React.SetStateAction<number>>;
}

export const HabitGrid = ({
  habits,
  completions,
  toggleHabit,
  onEditHabit,
  onDeleteHabit,
  onAddHabit,
  onViewHabitDetail,
  selectedYear,
  selectedMonth,
  setSelectedYear,
  setSelectedMonth
}: HabitGridProps) => {
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const dates = getDatesInMonth(selectedYear, selectedMonth);
  const today = new Date();
  const todayStr = formatDateKey(today);

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
    else setSelectedMonth(selectedMonth - 1);
  };

  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
    else setSelectedMonth(selectedMonth + 1);
  };

  const setTodayMonth = () => {
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const scrollToToday = () => {
    if (gridContainerRef.current) {
      const todayEl = gridContainerRef.current.querySelector('[data-today="true"]');
      if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  useEffect(() => {
    (window as any).scrollToTodayColumn = scrollToToday;
    return () => { delete (window as any).scrollToTodayColumn; };
  }, [selectedYear, selectedMonth]);

  const handleCellClick = (habit: Habit, date: Date, e: React.MouseEvent<HTMLButtonElement>) => {
    const dateStr = formatDateKey(date);
    const isNowCompleted = toggleHabit(habit.id, dateStr);

    if (isNowCompleted) {
      playCompleteSound();
      const diffTime = Math.abs(today.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        e.currentTarget.classList.add('completed-pulse');
        setTimeout(() => e.currentTarget?.classList.remove('completed-pulse'), 400);

        const rect = e.currentTarget.getBoundingClientRect();
        confetti({
          particleCount: 25,
          spread: 30,
          origin: {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight
          },
          colors: ['#10b981', '#34d399', '#059669', '#22c55e'],
          disableForReducedMotion: true
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 rounded-2xl glass-panel border border-white/5">
      {/* Month Navigator Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2 hidden sm:flex">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <Calendar className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={setTodayMonth} className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs sm:text-sm font-semibold hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer">
            Today
          </button>
          <div className="flex items-center bg-white/5 border border-white/5 rounded-xl overflow-hidden">
            <button onClick={prevMonth} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer" aria-label="Previous Month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button onClick={nextMonth} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer" aria-label="Next Month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={scrollToToday} className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold hover:bg-emerald-600/20 transition-all cursor-pointer">
            Focus Today
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div ref={gridContainerRef} className="overflow-x-auto hide-scrollbar rounded-xl border border-white/5 bg-black/10">
        <div className="min-w-max">
          {/* Header row */}
          <div className="flex border-b border-white/5">
            <div className="sticky left-0 w-32 min-w-[8rem] sm:w-52 sm:min-w-[13rem] p-3 font-semibold text-xs uppercase text-gray-400 bg-[#0e1612]/90 backdrop-blur-md border-r border-white/5 flex items-center justify-between z-20">
              <span>Habit</span>
              <button onClick={onAddHabit} className="p-1 rounded-md hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer" title="Add Habit">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {dates.map(date => {
              const dateStr = formatDateKey(date);
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={dateStr}
                  data-today={isToday}
                  className={`w-10 min-w-[2.5rem] py-2 flex flex-col items-center justify-center border-r border-white/5 last:border-r-0 ${isToday ? 'bg-emerald-500/10 relative' : ''}`}
                >
                  {isToday && <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                    {WEEKDAYS_SHORT[date.getDay()][0]}
                  </span>
                  <span className={`text-xs font-semibold mt-0.5 ${isToday ? 'text-emerald-400 font-extrabold' : 'text-gray-300'}`}>
                    {date.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Habit rows */}
          {habits.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No habits yet. Click "+" to add your first habit!
            </div>
          ) : (
            habits.map(habit => {
              const preferredDays = habit.schedule ?? [];
              const timesPerWeek = habit.timesPerWeek ?? preferredDays.length ?? 7;

              return (
                <div key={habit.id} className="flex border-b border-white/5 last:border-b-0 hover:bg-white/[0.01] transition-colors">
                  {/* Sticky row label */}
                  <div className="sticky left-0 w-32 min-w-[8rem] sm:w-52 sm:min-w-[13rem] p-2 sm:p-3 flex items-center justify-between bg-[#0c1410]/90 backdrop-blur-md border-r border-white/5 group z-20">
                    <button
                      onClick={() => onViewHabitDetail(habit)}
                      className="flex items-center gap-1.5 sm:gap-2 overflow-hidden pr-1 flex-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                      title={`View analytics for ${habit.name}`}
                    >
                      <span className="text-base sm:text-lg flex-shrink-0">{habit.emoji}</span>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-semibold text-gray-200 truncate block" title={habit.name}>
                          {habit.name}
                        </span>
                        {/* Frequency badge */}
                        <span className="text-[9px] sm:text-[10px] text-emerald-400/70 font-bold">
                          {timesPerWeek}×/wk
                        </span>
                      </div>
                    </button>
                    
                    <div className="flex items-center gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => onEditHabit(habit)} className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer" title="Edit">
                        <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                      <button onClick={() => onDeleteHabit(habit.id)} className="p-1 rounded-md hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer" title="Delete">
                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                      <button onClick={() => onViewHabitDetail(habit)} className="p-1 rounded-md hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer hidden sm:flex" title="View analytics">
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Day cells — ALL days are clickable; preferred days get a subtle dot */}
                  {dates.map(date => {
                    const dateStr = formatDateKey(date);
                    const isToday = dateStr === todayStr;
                    const dayCompletions = completions[dateStr] || [];
                    const isChecked = dayCompletions.includes(habit.id);
                    const isLoggable = isDateLoggable(date);
                    const isPreferred = preferredDays.includes(date.getDay());

                    return (
                      <div
                        key={`${habit.id}-${dateStr}`}
                        className={`w-10 min-w-[2.5rem] h-11 flex items-center justify-center border-r border-white/5 last:border-r-0 relative ${isToday ? 'bg-emerald-500/5' : ''}`}
                      >
                        <button
                          onClick={(e) => handleCellClick(habit, date, e)}
                          disabled={!isLoggable}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300 border relative ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/20'
                              : isPreferred
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-transparent'
                                : 'bg-white/[0.02] border-white/10 text-transparent'
                          } ${
                            isLoggable
                              ? 'cursor-pointer hover:scale-110'
                              : 'cursor-not-allowed opacity-40'
                          }`}
                          title={
                            isLoggable
                              ? `${habit.name} — ${date.toLocaleDateString('default', { month: 'short', day: 'numeric' })}${isPreferred ? ' (preferred day)' : ''}`
                              : `Locked: ${date.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`
                          }
                          aria-label={`Toggle ${habit.name} on ${dateStr}`}
                        >
                          {isChecked ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                              <path className="animate-checkmark" strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : isLoggable ? (
                            /* Preferred day: emerald dot; non-preferred: dimmer dot */
                            <span className={`w-1.5 h-1.5 rounded-full ${isPreferred ? 'bg-emerald-400/50' : 'bg-white/20'}`} />
                          ) : null}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile hints */}
      <div className="flex flex-col items-center gap-1 sm:hidden text-center">
        <span className="text-[10px] text-gray-500 font-medium">← Swipe to see other days</span>
        <span className="text-[10px] text-gray-600">Tap habit name to view analytics</span>
      </div>
    </div>
  );
};
