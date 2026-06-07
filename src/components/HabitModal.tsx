import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Smile } from 'lucide-react';
import type { Habit } from '../hooks/useHabits';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, emoji: string) => void;
  habitToEdit?: Habit | null;
}

const PRESET_EMOJIS = [
  '📚', '💻', '🏗️', '🏋️', '🇬🇧', 
  '🧘', '🍎', '💧', '🚶', '✍️', 
  '🧹', '🛌', '🚭', '🌱', '🎵',
  '🎨', '💰', '🔑', '⏰', '🔋'
];

export const HabitModal = ({
  isOpen,
  onClose,
  onSubmit,
  habitToEdit
}: HabitModalProps) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📚');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setName(habitToEdit.name);
        setEmoji(habitToEdit.emoji);
      } else {
        setName('');
        setEmoji('📚');
      }
      // Auto focus input
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), emoji);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div 
        ref={modalRef}
        className="w-full max-w-md rounded-2xl border border-white/10 glass-panel shadow-2xl overflow-hidden relative z-10 transform scale-100 transition-all duration-300 animate-zoom-in"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/5">
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
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
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

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Select Icon/Emoji
            </label>
            <div className="flex gap-3 items-center mb-3">
              {/* Selected Emoji display */}
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
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
                  maxLength={4} // Allows compound emoji (like country flags)
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

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-2">
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
