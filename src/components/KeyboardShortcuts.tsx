import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keycap: string;
  description: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keycap: 'N', description: 'Create a new habit' },
  { keycap: 'T', description: 'Scroll grid focus to today\'s date' },
  { keycap: 'E', description: 'Export habit history to a JSON backup file' },
  { keycap: 'I', description: 'Trigger import file picker for JSON restore' },
  { keycap: '?', description: 'Open this keyboard shortcuts panel' },
  { keycap: 'ESC', description: 'Close active modal / dialog' }
];

export const KeyboardShortcuts = ({ isOpen, onClose }: KeyboardShortcutsProps) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="w-full max-w-md rounded-2xl border border-white/10 glass-panel shadow-2xl overflow-hidden relative z-10 transform scale-100 transition-all duration-300 animate-zoom-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close shortcuts"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {SHORTCUTS.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-sm text-gray-300 font-medium">
                  {item.description}
                </span>
                
                {/* Styled Keycap */}
                <kbd className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs font-mono font-bold text-emerald-300 shadow-[0_2px_0_0_rgba(16,185,129,0.3)] min-w-[28px] text-center">
                  {item.keycap}
                </kbd>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-center text-gray-500 font-semibold mt-2">
            Press keys directly on the dashboard to trigger commands.
          </div>
        </div>
      </div>
    </div>
  );
};
