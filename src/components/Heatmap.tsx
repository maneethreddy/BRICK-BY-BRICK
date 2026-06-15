import { useMemo } from 'react';
import type { Habit, DailyCompletions } from '../hooks/useHabits';
import { getHeatmapDates, formatDateKey } from '../utils/dateUtils';
import { Flame } from 'lucide-react';

interface HeatmapProps {
  habits: Habit[];
  completions: DailyCompletions;
  selectedYear: number;
}

export const Heatmap = ({ habits, completions, selectedYear }: HeatmapProps) => {
  const dates = useMemo(() => getHeatmapDates(selectedYear), [selectedYear]);

  // For each day: how many habits were completed vs total active habits
  const dateCellData = useMemo(() => {
    const result: { [dateStr: string]: { count: number; ratio: number } } = {};

    dates.forEach(date => {
      const dateStr = formatDateKey(date);
      const dayCompletions = completions[dateStr] || [];
      const count = dayCompletions.filter(id => habits.some(h => h.id === id)).length;
      const ratio = habits.length > 0 ? count / habits.length : 0;
      result[dateStr] = { count, ratio };
    });

    return result;
  }, [dates, completions, habits]);

  const getCellColorClass = (dateStr: string, isFuture: boolean) => {
    if (isFuture) return 'bg-white/[0.01] border-white/[0.01] cursor-default';
    const data = dateCellData[dateStr];
    if (!data || data.count === 0 || habits.length === 0) return 'bg-white/[0.03] border-white/[0.02] hover:bg-white/[0.08]';
    const { ratio } = data;
    if (ratio <= 0.25) return 'bg-emerald-950/70 border-emerald-900/10 hover:bg-emerald-950 text-emerald-400';
    if (ratio <= 0.5)  return 'bg-emerald-800/60 border-emerald-700/20 hover:bg-emerald-800 text-emerald-300';
    if (ratio <= 0.75) return 'bg-emerald-600/80 border-emerald-500/20 hover:bg-emerald-600 text-emerald-200';
    return 'bg-emerald-400 border-emerald-300/30 hover:bg-emerald-300 text-black';
  };

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

  return (
    <div className="flex flex-col gap-4 p-5 sm:p-6 rounded-2xl glass-panel border border-white/5">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Contribution Heatmap</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-white/[0.03] border border-white/[0.02]" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-950/70 border border-emerald-900/10" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-800/60 border border-emerald-700/20" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600/80 border border-emerald-500/20" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-300/30" />
          <span>More</span>
        </div>
      </div>

      <div className="flex flex-col overflow-x-auto hide-scrollbar select-none py-2">
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
                const data = dateCellData[dateStr];
                const count = data?.count ?? 0;
                const todayMidnight = new Date();
                todayMidnight.setHours(0, 0, 0, 0);
                const isFuture = date.getTime() > todayMidnight.getTime();
                const formattedDate = date.toLocaleDateString('default', {
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                });

                return (
                  <div key={index} className="group relative">
                    <button
                      className={`w-2.5 h-2.5 rounded-[2px] border transition-colors cursor-default focus:outline-none ${getCellColorClass(dateStr, isFuture)}`}
                      aria-label={`${count} completions on ${formattedDate}`}
                    />
                    {!isFuture && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                        <div className="bg-gray-950 border border-white/10 px-2 py-1 rounded-md text-[10px] font-bold text-gray-200 shadow-xl whitespace-nowrap">
                          <span className="text-emerald-400 font-extrabold">{count}</span>
                          {' '}{count === 1 ? 'habit' : 'habits'} completed
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
        </div>
      </div>
    </div>
  );
};
