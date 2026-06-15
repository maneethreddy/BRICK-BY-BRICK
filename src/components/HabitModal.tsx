import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Smile, Calendar } from 'lucide-react';
import type { Habit } from '../hooks/useHabits';
import { DAILY_SCHEDULE } from '../hooks/useHabits';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, emoji: string, schedule: number[]) => void;
  habitToEdit?: Habit | null;
}

const PRESET_EMOJIS = [
  '📚', '💻', '🏗️', '🏋️', '🇬🇧', 
  '🧘', '🍎', '💧', '🚶', '✍️', 
  '🧹', '🛌', '🚭', '🌱', '🎵',
  '🎨', '💰', '🔑', '⏰', '🔋'
];

type SchedulePreset = 'daily' | 'weekdays' | 'weekends' | 'custom';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRESET_SCHEDULES: Record<SchedulePreset, number[]> = {
  daily: [0, 1, 2, 3, 4, 5, 6],
  weekdays: [1, 2, 3, 4, 5],
  weekends: [0, 6],
  custom: []
};

const detectPreset = (schedule: number[]): SchedulePreset => {
  const sorted = [...schedule].sort().join(',');
  if (sorted === '0,1,2,3,4,5,6') return 'daily';
  if (sorted === '1,2,3,4,5') return 'weekdays';
  if (sorted === '0,6') return 'weekends';
  return 'custom';
};

export const HabitModal = ({
  isOpen,
  onClose,
  onSubmit,
  habitToEdit
}: HabitModalProps) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📚');
  const [schedulePreset, setSchedulePreset] = useState<SchedulePreset>('daily');
  const [customDays, setCustomDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSchedule: number[] = schedulePreset === 'custom' ? customDays : PRESET_SCHEDULES[schedulePreset];

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setName(habitToEdit.name);
        setEmoji(habitToEdit.emoji);
        const existingSchedule = habitToEdit.schedule ?? DAILY_SCHEDULE;
        const preset = detectPreset(existingSchedule);
        setSchedulePreset(preset);
        setCustomDays(existingSchedule);
      } else {
        setName('');
        setEmoji('📚');
        setSchedulePreset('daily');
        setCustomDays([0, 1, 2, 3, 4, 5, 6]);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, habitToEdit]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleCustomDay = (day: number) => {
    setCustomDays(prev => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // keep at least 1 day
        return prev.filter(d => d !== day);
      }
      return [...prev, day].sort();
    });
  };

  const handlePresetChange = (preset: SchedulePreset) => {
    setSchedulePreset(preset);
    if (preset !== 'custom') {
      setCustomDays(PRESET_SCHEDULES[preset]);
    } else {
      // Retain last known selection
      setCustomDays(prev => prev.length > 0 ? prev : [1, 2, 3, 4, 5]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const finalSchedule = activeSchedule.length > 0 ? activeSchedule : DAILY_SCHEDULE;
    onSubmit(name.trim(), emoji, finalSchedule);
    onClose();
  };

  const targetDaysPerWeek = activeSchedule.length;

  const getScheduleSummary = (): string => {
    if (schedulePreset === 'daily') return 'Every day';
    if (schedulePreset === 'weekdays') return 'Mon – Fri';
    if (schedulePreset === 'weekends') return 'Sat & Sun';
    const labels = activeSchedule.map(d => WEEKDAY_LABELS[d]).join(', ');
    return labels || 'No days selected';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Dark Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog — bottom sheet on mobile, centered on desktop */}
      <div 
        ref={modalRef}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 glass-panel shadow-2xl overflow-hidden relative z-10 transition-all duration-300 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-white/5 sticky top-0 glass-panel z-10">
          {/* Mobile drag handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 sm:hidden" />
          <h3 className="text-lg font-bold text-white tracking-tight">
            {habitToEdit ? 'Edit Habit' : 'Create New Habit'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
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
              placeholder="e.g. Daily Meditation, Code DSA..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 focus:border-emerald-500/50 focus:bg-black/30 focus:ring-1 focus:ring-emerald-500/50 text-white placeholder-gray-500 font-semibold outline-none transition-all"
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Select Icon/Emoji
            </label>
            <div className="flex gap-3 items-center mb-3">
              {/* Selected Emoji display */}
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

            {/* Quick Presets Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-[120px] overflow-y-auto p-1 bg-black/10 border border-white/5 rounded-xl">
              {PRESET_EMOJIS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setEmoji(preset)}
                  className={`py-2 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${
                    emoji === preset
                      ? 'bg-emerald-600 border border-emerald-400 text-white scale-110 shadow-md shadow-emerald-950/50'
                      : 'bg-white/0 border border-transparent hover:bg-white/5 text-gray-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Repeat Schedule Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Repeat Schedule
              </label>
            </div>

            {/* Preset Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 mb-3">
              {((['daily', 'weekdays', 'weekends', 'custom'] as SchedulePreset[])).map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetChange(preset)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold capitalize transition-all duration-200 cursor-pointer ${
                    schedulePreset === preset
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {preset === 'weekdays' ? 'Weekdays' : preset === 'weekends' ? 'Weekends' : preset === 'daily' ? 'Daily' : 'Custom'}
                </button>
              ))}
            </div>

            {/* Custom Day Chips */}
            {schedulePreset === 'custom' && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {WEEKDAY_LABELS.map((label, idx) => {
                  const isSelected = customDays.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleCustomDay(idx)}
                      className={`flex-1 min-w-[36px] py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer border ${
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
            )}

            {/* Live Summary */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <span className="text-xs text-gray-400 font-medium">{getScheduleSummary()}</span>
              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {targetDaysPerWeek}d/week
              </span>
            </div>
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
              disabled={!name.trim() || activeSchedule.length === 0}
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
