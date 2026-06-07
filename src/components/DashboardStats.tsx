import { Flame, Trophy, Award, CheckCircle2, Target } from 'lucide-react';
import type { HabitStats } from '../hooks/useHabits';

interface DashboardStatsProps {
  stats: HabitStats;
  monthlyGoal: number;
}

export const DashboardStats = ({ stats, monthlyGoal }: DashboardStatsProps) => {
  const { todayScore, currentStreak, longestStreak, monthlyCompletionRate, totalCompletionsCount } = stats;

  const cardData = [
    {
      title: "Today's Score",
      value: `${todayScore}%`,
      subtext: todayScore === 100 ? "Perfect day! 🎉" : "Keep going!",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      glowColor: "group-hover:border-emerald-500/30",
      progress: todayScore,
      progressBarColor: "bg-emerald-500"
    },
    {
      title: "Current Streak",
      value: `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`,
      subtext: currentStreak > 0 ? "You're on fire! 🔥" : "Complete a habit to start",
      icon: <Flame className="w-5 h-5 text-amber-500" />,
      glowColor: "group-hover:border-amber-500/30",
      progress: null
    },
    {
      title: "Longest Streak",
      value: `${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}`,
      subtext: "Personal best record 🏆",
      icon: <Trophy className="w-5 h-5 text-yellow-400" />,
      glowColor: "group-hover:border-yellow-500/30",
      progress: null
    },
    {
      title: "Monthly Completion",
      value: `${monthlyCompletionRate}%`,
      subtext: `Goal is ${monthlyGoal}% ${monthlyCompletionRate >= monthlyGoal ? 'Met! 🌟' : ''}`,
      icon: <Target className="w-5 h-5 text-emerald-400" />,
      glowColor: "group-hover:border-emerald-500/30",
      progress: Math.min(100, (monthlyCompletionRate / monthlyGoal) * 100),
      progressBarColor: monthlyCompletionRate >= monthlyGoal ? "bg-emerald-500" : "bg-emerald-600"
    },
    {
      title: "Total Completed",
      value: totalCompletionsCount.toLocaleString(),
      subtext: "Total checkmarks ever 📈",
      icon: <Award className="w-5 h-5 text-pink-400" />,
      glowColor: "group-hover:border-pink-500/30",
      progress: null
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cardData.map((card, idx) => (
        <div
          key={idx}
          className={`group relative flex flex-col justify-between p-5 rounded-2xl glass-panel transition-all duration-300 hover:translate-y-[-2px] border border-white/5 ${card.glowColor}`}
        >
          {/* Glowing Background Glow on Hover */}
          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/[0.02] group-hover:to-white/[0.04] transition-all duration-300" />
          
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {card.title}
            </span>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform duration-300">
              {card.icon}
            </div>
          </div>

          <div className="flex flex-col mt-2">
            <span className="text-2xl font-extrabold text-white tracking-tight">
              {card.value}
            </span>
            <span className="text-xs text-gray-400 mt-1 font-medium">
              {card.subtext}
            </span>
          </div>

          {/* Optional progress bar for Today's Score and Monthly Completion */}
          {card.progress !== null && (
            <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
              <div 
                className={`h-full ${card.progressBarColor} rounded-full transition-all duration-500`}
                style={{ width: `${card.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
