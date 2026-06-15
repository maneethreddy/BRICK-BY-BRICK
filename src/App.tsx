import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from './firebase';
import { Auth } from './components/Auth';
import { useHabits } from './hooks/useHabits';
import type { Habit } from './hooks/useHabits';
import { DashboardStats } from './components/DashboardStats';
import { HabitGrid } from './components/HabitGrid';
import { Heatmap } from './components/Heatmap';
import { ProgressChart } from './components/ProgressChart';
import { Analytics } from './components/Analytics';
import { HabitModal } from './components/HabitModal';
import { HabitDetailModal } from './components/HabitDetailModal';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { Toast } from './components/Toast';
import type { ToastProps } from './components/Toast';
import { getQuoteOfTheDay } from './utils/quotes';
import { formatDateKey } from './utils/dateUtils';
import { 
  Plus, 
  Download, 
  Upload, 
  Keyboard, 
  Sliders, 
  CheckSquare, 
  Quote,
  LogOut
} from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Monitor Authentication Session
  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
  }, []);

  const {
    habits,
    completions,
    monthlyGoal,
    addHabit,
    editHabit,
    deleteHabit,
    toggleHabit,
    setMonthlyGoal,
    exportData,
    importData,
    statistics
  } = useHabits(user);

  // --- UI States ---
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isGoalSettingsOpen, setIsGoalSettingsOpen] = useState(false);
  const [selectedDetailHabit, setSelectedDetailHabit] = useState<Habit | null>(null);
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const quote = getQuoteOfTheDay();

  // Helper for displaying toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  // --- Sign Out Action ---
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showToast("Logged out successfully.", "info");
    } catch (e) {
      showToast("Failed to log out.", "error");
    }
  };

  // --- Export Action ---
  const handleExport = () => {
    try {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `habit_tracker_backup_${formatDateKey(new Date())}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Data exported successfully!", "success");
    } catch (e) {
      showToast("Export failed.", "error");
    }
  };

  // --- Import Action ---
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const success = await importData(text);
      if (success) {
        showToast("Backup restored successfully!", "success");
      } else {
        showToast("Failed to restore backup. Check JSON file format.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Clear file input
  };

  // --- Add/Edit Habit Modal Submission — now accepts schedule ---
  const handleHabitSubmit = async (name: string, emoji: string, schedule: number[]) => {
    try {
      if (editingHabit) {
        await editHabit(editingHabit.id, name, emoji, schedule);
        showToast(`Updated habit: ${name}`, "success");
        setEditingHabit(null);
      } else {
        await addHabit(name, emoji, schedule);
        showToast(`Created habit: ${name}`, "success");
      }
    } catch (e: any) {
      console.error('Habit submit error:', e);
      showToast(e.message || "Failed to save habit.", "error");
    }
  };

  const handleEditClick = (habit: Habit) => {
    setEditingHabit(habit);
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (window.confirm(`Are you sure you want to delete "${habit?.name}"? All completion records for this habit will be removed.`)) {
      try {
        await deleteHabit(id);
        showToast("Habit deleted", "info");
      } catch (e: any) {
        console.error('Habit delete error:', e);
        showToast("Failed to delete habit.", "error");
      }
    }
  };

  const handleViewHabitDetail = (habit: Habit) => {
    setSelectedDetailHabit(habit);
  };

  // --- Global Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if user is typing in forms
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        setEditingHabit(null);
        setIsAddModalOpen(true);
      } else if (key === 't') {
        e.preventDefault();
        if (typeof (window as any).scrollToTodayColumn === 'function') {
          (window as any).scrollToTodayColumn();
          showToast("Scrolled to today's column", "info");
        }
      } else if (key === 'e') {
        e.preventDefault();
        handleExport();
      } else if (key === 'i') {
        e.preventDefault();
        fileInputRef.current?.click();
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [habits, completions, monthlyGoal]);

  // Render Authentication Guard Loader
  if (authChecking) {
    return (
      <div className="min-h-screen text-gray-100 flex items-center justify-center bg-[#070c09]">
        <span className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Render Authentication Portal if not logged in
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen text-gray-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-white">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 flex-1 flex flex-col gap-5 sm:gap-6 md:px-6">
        
        {/* Header Section */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-5 sm:pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 flex-shrink-0">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Brick by Brick
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 font-bold tracking-wider uppercase">
                Personal Progress Tracker
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* User Profile Info */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {user.email}
            </div>

            <button
              onClick={() => setIsGoalSettingsOpen(!isGoalSettingsOpen)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isGoalSettingsOpen
                  ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Goal:</span> {monthlyGoal}%
            </button>

            <button
              onClick={handleExport}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs sm:text-sm font-semibold hover:bg-white/10 text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              title="Export JSON backup (E)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs sm:text-sm font-semibold hover:bg-white/10 text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              title="Import JSON backup (I)"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>

            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer hidden sm:flex"
              title="Shortcuts (?)"
            >
              <Keyboard className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={handleSignOut}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs sm:text-sm font-semibold hover:bg-rose-500/15 hover:border-rose-500/20 text-gray-300 hover:text-rose-400 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

            <button
              onClick={() => {
                setEditingHabit(null);
                setIsAddModalOpen(true);
              }}
              className="px-3 sm:px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/50 hover:translate-y-[-1px] transition-all flex items-center gap-1.5 cursor-pointer"
              title="Add new habit (N)"
            >
              <Plus className="w-4 h-4" />
              New Habit
            </button>
          </div>
        </header>

        {/* Goal Settings Expandable Panel */}
        {isGoalSettingsOpen && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">Monthly Completion Target</h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Set the percentage of habit logs you aim to complete each month.
              </p>
            </div>
            <div className="flex items-center gap-4 sm:min-w-[200px]">
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
              <span className="text-base font-extrabold text-emerald-400 w-12 text-right">
                {monthlyGoal}%
              </span>
            </div>
          </div>
        )}

        {/* Motivational Quote banner */}
        <div className="p-4 rounded-2xl glass-panel border border-white/5 flex gap-3 sm:gap-3.5 items-start">
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 text-emerald-400 border border-white/5 flex-shrink-0">
            <Quote className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-200 italic leading-relaxed">
              "{quote.text}"
            </p>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-1.5">
              — {quote.author}
            </p>
          </div>
        </div>

        {/* Statistics Dash Cards */}
        <DashboardStats stats={statistics} monthlyGoal={monthlyGoal} />

        {/* Notion Grid Board */}
        <HabitGrid
          habits={habits}
          completions={completions}
          toggleHabit={toggleHabit}
          onEditHabit={handleEditClick}
          onDeleteHabit={handleDeleteClick}
          onAddHabit={() => {
            setEditingHabit(null);
            setIsAddModalOpen(true);
          }}
          onViewHabitDetail={handleViewHabitDetail}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          setSelectedYear={setSelectedYear}
          setSelectedMonth={setSelectedMonth}
        />

        {/* Double Column Graph & Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          <ProgressChart
            habits={habits}
            completions={completions}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            monthlyGoal={monthlyGoal}
          />
          <Heatmap
            habits={habits}
            completions={completions}
            selectedYear={selectedYear}
          />
        </div>

        {/* Monthly Insights / Analytics */}
        <Analytics
          habits={habits}
          completions={completions}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
        />
        
        {/* Footer */}
        <footer className="text-center py-5 text-[10px] text-gray-500 font-semibold tracking-wider uppercase border-t border-white/5 mt-2 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© {new Date().getFullYear()} Brick by Brick</span>
          <span className="hidden sm:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[9px]">?</kbd>
            Press "?" for shortcuts panel
          </span>
        </footer>
      </div>

      {/* Habit Create / Edit Modal */}
      <HabitModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingHabit(null);
        }}
        onSubmit={handleHabitSubmit}
        habitToEdit={editingHabit}
      />

      {/* Habit Detail Analytics Modal */}
      {selectedDetailHabit && (
        <HabitDetailModal
          habit={selectedDetailHabit}
          completions={completions}
          onClose={() => setSelectedDetailHabit(null)}
        />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcuts
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Toast Notification Manager */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
