import { useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { formatDateKey, getTodayStr, getDaysInMonthCount, isDateLoggable } from '../utils/dateUtils';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  /** Preferred days of week (0=Sun … 6=Sat). Used as visual hints only — not enforced. */
  schedule: number[];
  /**
   * Actual weekly frequency target (1–7).
   * Analytics and streaks are based on this count, not specific day matching.
   * Defaults to schedule.length if not set.
   */
  timesPerWeek: number;
}

export interface DailyCompletions {
  [dateStr: string]: string[];
}

export interface HabitStats {
  todayScore: number;
  currentStreak: number;
  longestStreak: number;
  monthlyCompletionRate: number;
  totalCompletionsCount: number;
}

const LOCAL_STORAGE_KEY_GOAL = 'antigravity_habit_tracker_goal';

/** Default daily schedule — all 7 days */
export const DAILY_SCHEDULE: number[] = [0, 1, 2, 3, 4, 5, 6];

// ─── Week helpers ─────────────────────────────────────────────────────────────

/** Get the ISO-ish week start (Sunday) for a given date */
export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return d;
};

/** Get Monday (start) … Sunday (end) dates for the calendar week containing `date` */
export const getWeekDates = (date: Date): Date[] => {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

/**
 * Count how many times `habitId` was completed in the calendar week containing `date`.
 */
export const countCompletionsInWeek = (
  habitId: string,
  date: Date,
  completions: DailyCompletions
): number => {
  return getWeekDates(date).reduce((count, d) => {
    const dateStr = formatDateKey(d);
    const dayCompletions = completions[dateStr] || [];
    return count + (dayCompletions.includes(habitId) ? 1 : 0);
  }, 0);
};

/**
 * Completion rate for a habit in a given week (0–1).
 * Capped at 1.0 even if they overachieved.
 */
export const getWeeklyRate = (
  habit: Habit,
  weekDate: Date,
  completions: DailyCompletions
): number => {
  const target = habit.timesPerWeek ?? habit.schedule.length ?? 7;
  if (target === 0) return 1;
  const done = countCompletionsInWeek(habit.id, weekDate, completions);
  return Math.min(1, done / target);
};

// ─────────────────────────────────────────────────────────────────────────────

export const useHabits = (user: User | null) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<DailyCompletions>({});
  const [monthlyGoal, setMonthlyGoal] = useState<number>(70);

  // Load local monthly goal settings
  useEffect(() => {
    const storedGoal = localStorage.getItem(LOCAL_STORAGE_KEY_GOAL);
    if (storedGoal) {
      setMonthlyGoal(Number(storedGoal));
    }
  }, []);

  const saveMonthlyGoal = (goal: number) => {
    setMonthlyGoal(goal);
    localStorage.setItem(LOCAL_STORAGE_KEY_GOAL, String(goal));
  };

  // --- Real-time Sync for Habits ---
  useEffect(() => {
    if (!user) {
      setHabits([]);
      return;
    }

    const q = query(
      collection(db, 'habits'), 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        const seededKey = `seeded_${user.uid}`;
        if (!localStorage.getItem(seededKey)) {
          localStorage.setItem(seededKey, 'true');
          addDoc(collection(db, 'habits'), {
            userId: user.uid,
            name: 'Wake up at 5:00 am',
            emoji: '⏰',
            schedule: DAILY_SCHEDULE,
            timesPerWeek: 7,
            createdAt: new Date().toISOString()
          }).catch((err) => {
            console.error('Failed to seed default habit:', err);
          });
        }
        setHabits([]);
        return;
      }
      const list: Habit[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const schedule = Array.isArray(data.schedule) ? data.schedule : DAILY_SCHEDULE;
        list.push({
          id: doc.id,
          name: data.name || '',
          emoji: data.emoji || '📝',
          schedule,
          timesPerWeek: typeof data.timesPerWeek === 'number' ? data.timesPerWeek : schedule.length,
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setHabits(list);
    }, (error) => {
      console.error('Failed to sync habits from Firestore:', error);
    });

    return unsubscribe;
  }, [user]);

  // --- Real-time Sync for Completions ---
  useEffect(() => {
    if (!user) {
      setCompletions({});
      return;
    }

    const q = query(
      collection(db, 'completions'), 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map: DailyCompletions = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.dateStr && Array.isArray(data.habitIds)) {
          map[data.dateStr] = data.habitIds;
        }
      });
      setCompletions(map);
    }, (error) => {
      console.error('Failed to sync completions from Firestore:', error);
    });

    return unsubscribe;
  }, [user]);

  // --- Firestore Actions ---
  const addHabit = async (
    name: string,
    emoji: string,
    schedule: number[] = DAILY_SCHEDULE,
    timesPerWeek?: number
  ) => {
    if (!user) throw new Error("User must be logged in to create a habit.");
    await addDoc(collection(db, 'habits'), {
      userId: user.uid,
      name,
      emoji: emoji.trim() || '📝',
      schedule,
      timesPerWeek: timesPerWeek ?? schedule.length,
      createdAt: new Date().toISOString()
    });
  };

  const editHabit = async (
    id: string,
    name: string,
    emoji: string,
    schedule: number[] = DAILY_SCHEDULE,
    timesPerWeek?: number
  ) => {
    if (!user) throw new Error("User must be logged in to edit a habit.");
    await updateDoc(doc(db, 'habits', id), {
      name,
      emoji: emoji.trim(),
      schedule,
      timesPerWeek: timesPerWeek ?? schedule.length
    });
  };

  const deleteHabit = async (id: string) => {
    if (!user) throw new Error("User must be logged in to delete a habit.");
    await deleteDoc(doc(db, 'habits', id));

    const promises = Object.keys(completions).map(async (dateStr) => {
      const dayCompletions = completions[dateStr];
      if (dayCompletions.includes(id)) {
        const nextCompleted = dayCompletions.filter(hid => hid !== id);
        const docId = `${user.uid}_${dateStr}`;
        const docRef = doc(db, 'completions', docId);
        if (nextCompleted.length === 0) {
          await deleteDoc(docRef);
        } else {
          await setDoc(docRef, { habitIds: nextCompleted }, { merge: true });
        }
      }
    });
    await Promise.all(promises);
  };

  const toggleHabit = (id: string, dateStr: string): boolean => {
    if (!user) return false;

    const dateParts = dateStr.split('-');
    const targetDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), 12, 0, 0, 0);
    if (!isDateLoggable(targetDate)) {
      console.warn(`Cannot log completion. Date ${dateStr} is locked.`);
      return false;
    }

    const currentCompleted = completions[dateStr] || [];
    const isCompleted = currentCompleted.includes(id);
    const nextCompleted = isCompleted
      ? currentCompleted.filter(hid => hid !== id)
      : [...currentCompleted, id];

    const docId = `${user.uid}_${dateStr}`;
    const docRef = doc(db, 'completions', docId);

    try {
      if (nextCompleted.length === 0) {
        deleteDoc(docRef);
      } else {
        setDoc(docRef, {
          userId: user.uid,
          dateStr,
          habitIds: nextCompleted
        }, { merge: true });
      }
    } catch (e) {
      console.error('Failed to toggle habit in Firestore:', e);
    }

    return !isCompleted;
  };

  // --- Backup Actions ---
  const exportData = (): string => {
    return JSON.stringify({ version: '1.3', habits, completions, monthlyGoal }, null, 2);
  };

  const importData = async (dataJson: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const parsed = JSON.parse(dataJson);
      if (parsed && Array.isArray(parsed.habits)) {
        for (const h of parsed.habits) {
          const schedule = Array.isArray(h.schedule) ? h.schedule : DAILY_SCHEDULE;
          await addDoc(collection(db, 'habits'), {
            userId: user.uid,
            name: h.name,
            emoji: h.emoji || '📝',
            schedule,
            timesPerWeek: typeof h.timesPerWeek === 'number' ? h.timesPerWeek : schedule.length,
            createdAt: h.createdAt || new Date().toISOString()
          });
        }

        const importedCompletions = parsed.completions || {};
        for (const dateStr of Object.keys(importedCompletions)) {
          const ids = importedCompletions[dateStr] || [];
          if (ids.length > 0) {
            const docId = `${user.uid}_${dateStr}`;
            await setDoc(doc(db, 'completions', docId), {
              userId: user.uid,
              dateStr,
              habitIds: ids
            });
          }
        }

        if (typeof parsed.monthlyGoal === 'number') {
          saveMonthlyGoal(parsed.monthlyGoal);
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import backup data to Firestore:', e);
      return false;
    }
  };

  // ─── Statistics (all frequency/count-based) ─────────────────────────────────
  const statistics = useMemo<HabitStats>(() => {
    const today = new Date();
    const todayStr = getTodayStr();

    if (habits.length === 0) {
      return { todayScore: 0, currentStreak: 0, longestStreak: 0, monthlyCompletionRate: 0, totalCompletionsCount: 0 };
    }

    // 1. Today's Score — average of "weekly progress so far" for each habit
    //    If a habit is on track for this week (done >= timesPerWeek already), score = 100 for it
    let totalTodayScore = 0;
    habits.forEach(habit => {
      const doneThisWeek = countCompletionsInWeek(habit.id, today, completions);
      const target = habit.timesPerWeek;
      const score = target > 0 ? Math.min(100, Math.round((doneThisWeek / target) * 100)) : 100;
      totalTodayScore += score;
    });
    const todayScore = Math.round(totalTodayScore / habits.length);

    // 2. Total completions count (all time)
    let totalCompletionsCount = 0;
    Object.values(completions).forEach(ids => {
      totalCompletionsCount += ids.filter(id => habits.some(h => h.id === id)).length;
    });

    // 3. Global current streak — days with at least 1 completion
    //    Walking backward from today (or yesterday if today has nothing)
    let currentStreak = 0;
    {
      const hasSomethingToday = Object.values(
        (completions[todayStr] || [])
      ).some(id => habits.some(h => h.id === id));

      const startOffset = hasSomethingToday ? 0 : 1;
      for (let offset = startOffset; offset < 400; offset++) {
        const d = new Date(today);
        d.setDate(today.getDate() - offset);
        const dStr = formatDateKey(d);
        const hasCompletion = (completions[dStr] || []).some(id => habits.some(h => h.id === id));
        if (hasCompletion) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // 4. Longest streak — same logic over all time
    let longestStreak = 0;
    {
      const allDateStrs = Object.keys(completions)
        .filter(dateStr => (completions[dateStr] || []).some(id => habits.some(h => h.id === id)))
        .sort();

      let tempStreak = 0;
      let prevDate: Date | null = null;

      for (const dateStr of allDateStrs) {
        const parts = dateStr.split('-');
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (prevDate === null) {
          tempStreak = 1;
        } else {
          const diffDays = Math.round((d.getTime() - prevDate.getTime()) / 86400000);
          if (diffDays === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        prevDate = d;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // 5. Monthly completion rate — count-based per habit
    //    Rate = sum across habits of (completions in month / target completions in month)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = getDaysInMonthCount(currentYear, currentMonth);
    // How many full weeks in the elapsed portion of the month
    const elapsedDays = now.getDate();
    const elapsedWeeks = elapsedDays / 7; // fractional weeks elapsed

    let totalRate = 0;
    habits.forEach(habit => {
      const target = habit.timesPerWeek;
      if (target === 0) { totalRate += 100; return; }

      // Count completions this month so far
      let monthCompletions = 0;
      for (let day = 1; day <= Math.min(elapsedDays, daysInMonth); day++) {
        const dateStr = formatDateKey(new Date(currentYear, currentMonth, day));
        const dayCompletions = completions[dateStr] || [];
        if (dayCompletions.includes(habit.id)) monthCompletions++;
      }

      // Expected completions = timesPerWeek * weeks elapsed
      const expectedCompletions = target * elapsedWeeks;
      const rate = expectedCompletions > 0 
        ? Math.min(100, Math.round((monthCompletions / expectedCompletions) * 100))
        : 100;
      totalRate += rate;
    });

    const monthlyCompletionRate = Math.round(totalRate / habits.length);

    return {
      todayScore,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      monthlyCompletionRate,
      totalCompletionsCount
    };
  }, [habits, completions]);

  return {
    habits,
    completions,
    monthlyGoal,
    addHabit,
    editHabit,
    deleteHabit,
    toggleHabit,
    setMonthlyGoal: saveMonthlyGoal,
    exportData,
    importData,
    statistics
  };
};
