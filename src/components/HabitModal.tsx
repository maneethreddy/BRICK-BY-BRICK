import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Smile, Calendar, Repeat } from 'lucide-react';
import type { Habit } from '../hooks/useHabits';
import { DAILY_SCHEDULE } from '../hooks/useHabits';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, emoji: string, schedule: number[], timesPerWeek: number) => void;
  habitToEdit?: Habit | null;
}

const PRESET_EMOJIS = [
  '📚', '💻', '🏗️', '🏋️', '🇬🇧', 
  '🧘', '🍎', '💧', '🚶', '✍️', 
  '🧹', '🛌', '🚭', '🌱', '🎵',
  '🎨', '💰', '🔑', '⏰', '🔋'
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Schedule mode — either pick specific preferred days OR just a frequency target
type ScheduleMode = 'frequency' | 'specific';

export const HabitModal = ({
  isOpen,
  onClose,
  onSubmit,
  habitToEdit
}: HabitModalProps) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📚');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('frequency');
  // timesPerWeek: the actual frequency target (1-7)
  const [timesPerWeek, setTimesPerWeek] = useState(7);
  // preferredDays: optional day hints shown in the grid (no locking)
  const [preferredDays, setPreferredDays] = useState<number[]>(DAILY_SCHEDULE);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setName(habitToEdit.name);
        setEmoji(habitToEdit.emoji);
        const tw = habitToEdit.timesPerWeek ?? habitToEdit.schedule.length ?? 7;
        const sched = habitToEdit.schedule ?? DAILY_SCHEDULE;
        setTimesPerWeek(tw);
        setPreferredDays(sched);
        // Detect mode: if timesPerWeek matches the schedule length exactly it was likely specific-days
        const allDaysPresent = sched.length === 7;
        if (allDaysPresent && tw === 7) {
          setScheduleMode('frequency');
        } else if (sched.length > 0 && sched.length !== 7) {
          setScheduleMode('specific');
        } else {
          setScheduleMode('frequency');
        }
      } else {
        setName('');
        setEmoji('📚');
        setScheduleMode('frequency');
        setTimesPerWeek(7);
        setPreferredDays(DAILY_SCHEDULE);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, habitToEdit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const togglePreferredDay = (day: number) => {
    setPreferredDays(prev => {
      if (prev.includes(day)) {
        const next = prev.filter(d => d !== day);
        if (next.length === 0) return prev; // keep at least 1
        // Sync timesPerWeek to match preferred count
        setTimesPerWeek(next.length);
        return next;
      }
      const next = [...prev, day].sort();
      setTimesPerWeek(next.length);
      return next;
    });
  };

  const handleTimesPerWeekChange = (val: number) => {
    const clamped = Math.max(1, Math.min(7, val));
    setTimesPerWeek(clamped);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    // In frequency mode, schedule = all 7 days (no preference locking)
    // In specific mode, schedule = selected preferred days
    const finalSchedule = scheduleMode === 'specific' ? preferredDays : DAILY_SCHEDULE;
    const finalTimesPerWeek = scheduleMode === 'specific' 
      ? preferredDays.length  // target = number of preferred days
      : timesPerWeek;
    onSubmit(name.trim(), emoji, finalSchedule, finalTimesPerWeek);
    onClose();
  };

  const getFrequencyLabel = (n: number): string => {
    if (n === 7) return 'Every day';
    if (n === 1) return 'Once a week';
    if (n === 2) return 'Twice a week';
    return `${n} times a week`;
  };

  const getPreferredDaysLabel = (): string => {
    if (preferredDays.length === 7) return 'Every day';
    if (preferredDays.length === 0) return 'No days selected';
    return preferredDays.map(d => WEEKDAY_LABELS[d]).join(', ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — bottom sheet on mobile */}
      <div
        ref={modalRef}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 glass-panel shadow-2xl relative z-10 max-h-[92vh] overflow-y-auto animate-zoom-in"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-white/5 sticky top-0 glass-panel z-10">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 sm:hidden" />
          <h3 className="text-lg font-bold text-white tracking-tight">
            {habitToEdit ? 'Edit Habit' : 'Create New Habit'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-4 pb-6 flex flex-col gap-5">
          {/* Habit Name */}
          <div>
            <label htmlFor="habit-name" className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Habit Name
            </label>
            <input
              ref={inputRef}
              id="habit-name"
              type="text"
              required
              placeholder="e.g. Morning Run, Read Books..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-gray-500 font-semibold outline-none transition-all"
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Icon
            </label>
            <div className="flex gap-3 items-center mb-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                {emoji}
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Smile className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Custom emoji..."
                  value={emoji}
                  maxLength={4}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-white/10 bg-black/10 text-white font-medium outline-none focus:border-emerald-500/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 max-h-[110px] overflow-y-auto p-1 bg-black/10 border border-white/5 rounded-xl">
              {PRESET_EMOJIS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setEmoji(preset)}
                  className={`py-2 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${
                    emoji === preset
                      ? 'bg-emerald-600 border border-emerald-400 scale-110 shadow-md shadow-emerald-950/50'
                      : 'border border-transparent hover:bg-white/5 text-gray-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Schedule
              </label>
            </div>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 mb-4">
              <button
                type="button"
                onClick={() => setScheduleMode('frequency')}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  scheduleMode === 'frequency'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                Times per Week
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('specific')}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  scheduleMode === 'specific'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Specific Days
              </button>
            </div>

            {scheduleMode === 'frequency' ? (
              /* ── Frequency Mode ── */
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Pick how many times per week. You can log on <span className="text-emerald-400 font-semibold">any day</span> — the count is what matters.
                </p>

                {/* Number chips 1–7 */}
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleTimesPerWeekChange(n)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-200 cursor-pointer border ${
                        timesPerWeek === n
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-900/50 scale-105'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:border-emerald-500/30 hover:text-emerald-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {/* Summary pill */}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <span className="text-xs text-gray-300 font-semibold">{getFrequencyLabel(timesPerWeek)}</span>
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    {timesPerWeek}× / week
                  </span>
                </div>
              </div>
            ) : (
              /* ── Specific Days Mode ── */
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Choose preferred days. The target is set to the <span className="text-emerald-400 font-semibold">number of selected days</span>. Completing on other days still counts.
                </p>

                {/* Day chips */}
                <div className="flex gap-1.5">
                  {WEEKDAY_LABELS.map((label, idx) => {
                    const isSelected = preferredDays.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => togglePreferredDay(idx)}
                        className={`flex-1 min-w-[34px] py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-900/50 scale-105'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Summary pill */}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <span className="text-xs text-gray-300 font-medium truncate pr-2">{getPreferredDaysLabel()}</span>
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap">
                    {preferredDays.length}× / week
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-sm font-semibold text-white shadow-lg shadow-emerald-950/35 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {habitToEdit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
