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
  /** Days of week the habit is scheduled. 0=Sun, 1=Mon, ..., 6=Sat. Defaults to daily [0-6]. */
  schedule: number[];
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

/**
 * Given a date, return which habits from the list are scheduled for that day.
 */
export const getScheduledHabitsForDate = (habits: Habit[], date: Date): Habit[] => {
  const dayOfWeek = date.getDay(); // 0=Sun … 6=Sat
  return habits.filter(h => (h.schedule ?? DAILY_SCHEDULE).includes(dayOfWeek));
};

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
        list.push({
          id: doc.id,
          name: data.name || '',
          emoji: data.emoji || '📝',
          schedule: Array.isArray(data.schedule) ? data.schedule : DAILY_SCHEDULE,
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      // Sort habits by creation date
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
  const addHabit = async (name: string, emoji: string, schedule: number[] = DAILY_SCHEDULE) => {
    if (!user) throw new Error("User must be logged in to create a habit.");
    await addDoc(collection(db, 'habits'), {
      userId: user.uid,
      name,
      emoji: emoji.trim() || '📝',
      schedule,
      createdAt: new Date().toISOString()
    });
  };

  const editHabit = async (id: string, name: string, emoji: string, schedule: number[] = DAILY_SCHEDULE) => {
    if (!user) throw new Error("User must be logged in to edit a habit.");
    await updateDoc(doc(db, 'habits', id), {
      name,
      emoji: emoji.trim(),
      schedule
    });
  };

  const deleteHabit = async (id: string) => {
    if (!user) throw new Error("User must be logged in to delete a habit.");
    // 1. Delete habit document
    await deleteDoc(doc(db, 'habits', id));

    // 2. Clean completions containing this habit ID
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

    // Enforce logging window logic
    const dateParts = dateStr.split('-');
    const targetDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), 12, 0, 0, 0);
    if (!isDateLoggable(targetDate)) {
      console.warn(`Cannot log completion. Date ${dateStr} is locked.`);
      return false;
    }

    const currentCompleted = completions[dateStr] || [];
    const isCompleted = currentCompleted.includes(id);
    let nextCompleted: string[];

    if (isCompleted) {
      nextCompleted = currentCompleted.filter(hid => hid !== id);
    } else {
      nextCompleted = [...currentCompleted, id];
    }

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
    const backup = {
      version: '1.2',
      habits,
      completions,
      monthlyGoal
    };
    return JSON.stringify(backup, null, 2);
  };

  const importData = async (dataJson: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const parsed = JSON.parse(dataJson);
      if (parsed && Array.isArray(parsed.habits)) {
        // Upload habits in batch/sequentially
        for (const h of parsed.habits) {
          await addDoc(collection(db, 'habits'), {
            userId: user.uid,
            name: h.name,
            emoji: h.emoji || '📝',
            schedule: Array.isArray(h.schedule) ? h.schedule : DAILY_SCHEDULE,
            createdAt: h.createdAt || new Date().toISOString()
          });
        }

        // Upload completions
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

  // --- Real-time Statistics Calculations (Memoized) ---
  const statistics = useMemo<HabitStats>(() => {
    const todayStr = getTodayStr();
    const today = new Date();
    
    // 1. Today's Score — only count habits scheduled for today
    const todayDayOfWeek = today.getDay();
    const scheduledToday = habits.filter(h => (h.schedule ?? DAILY_SCHEDULE).includes(todayDayOfWeek));
    const completedToday = completions[todayStr] || [];
    const validCompletedToday = completedToday.filter(id => scheduledToday.some(h => h.id === id));
    const todayScore = scheduledToday.length > 0 
      ? Math.round((validCompletedToday.length / scheduledToday.length) * 100) 
      : 100; // Rest day — all habits scheduled for today are satisfied

    // 2. Total completions count (all time, for any active habit regardless of schedule)
    let totalCompletionsCount = 0;
    Object.values(completions).forEach(ids => {
      totalCompletionsCount += ids.filter(id => habits.some(h => h.id === id)).length;
    });

    // --- Helper: does a given date (Date obj) have any completion for any scheduled habit? ---
    const hasAnyScheduledCompletion = (date: Date): boolean => {
      const dateStr = formatDateKey(date);
      const scheduled = getScheduledHabitsForDate(habits, date);
      if (scheduled.length === 0) return true; // rest day, don't break streak
      const dayCompletions = completions[dateStr] || [];
      return dayCompletions.some(id => scheduled.some(h => h.id === id));
    };

    // --- Helper: is this day a pure rest day (no habits scheduled at all)? ---
    const isRestDay = (date: Date): boolean => {
      return getScheduledHabitsForDate(habits, date).length === 0;
    };

    // 3. Current Streak — walk backward, skip rest days
    let currentStreak = 0;

    // If today isn't done yet (no completions), check if yesterday counts to keep streak alive
    // But we still start from today and walk back
    let dayOffset = 0;
    while (true) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - dayOffset);

      if (isRestDay(checkDate)) {
        // skip rest days silently (they don't break/advance streak)
        dayOffset++;
        if (dayOffset > 400) break; // safety cap
        continue;
      }

      const done = hasAnyScheduledCompletion(checkDate);
      if (done) {
        currentStreak++;
        dayOffset++;
      } else {
        break;
      }
    }

    // If today has no completion yet, streak starts from yesterday
    // Handle: today hasn't been completed yet — re-check starting from yesterday
    {
      const todayScheduled = getScheduledHabitsForDate(habits, today);
      const todayCompletionsArr = completions[todayStr] || [];
      const todayDone = todayCompletionsArr.some(id => todayScheduled.some(h => h.id === id));

      if (!todayDone && todayScheduled.length > 0) {
        // Recompute streak starting from yesterday
        let streak = 0;
        let offset = 1;
        while (true) {
          const d = new Date(today);
          d.setDate(today.getDate() - offset);
          if (isRestDay(d)) { offset++; if (offset > 400) break; continue; }
          const done = (() => {
            const dStr = formatDateKey(d);
            const sched = getScheduledHabitsForDate(habits, d);
            if (sched.length === 0) return true;
            const dc = completions[dStr] || [];
            return dc.some(id => sched.some(h => h.id === id));
          })();
          if (done) { streak++; offset++; } else { break; }
        }
        currentStreak = streak;
      }
    }

    // 4. Longest Streak — walk all completion dates considering schedule
    let longestStreak = 0;
    {
      // Gather all unique date strings across completions
      const allDateStrs = new Set<string>(Object.keys(completions));
      const sortedDates = Array.from(allDateStrs).sort();

      let tempStreak = 0;
      let prevDate: Date | null = null;

      for (const dateStr of sortedDates) {
        const parts = dateStr.split('-');
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const sched = getScheduledHabitsForDate(habits, d);
        if (sched.length === 0) continue; // skip rest days

        const dc = completions[dateStr] || [];
        const done = dc.some(id => sched.some(h => h.id === id));

        if (!done) {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 0;
          prevDate = null;
          continue;
        }

        if (prevDate === null) {
          tempStreak = 1;
        } else {
          // Walk from prevDate+1 to d, skipping rest days
          let walkDate = new Date(prevDate);
          walkDate.setDate(walkDate.getDate() + 1);
          let broken = false;
          while (formatDateKey(walkDate) !== dateStr) {
            if (!isRestDay(walkDate)) {
              // There's a non-rest-day between prev and current that has no completion
              const wStr = formatDateKey(walkDate);
              const ws = getScheduledHabitsForDate(habits, walkDate);
              const wc = completions[wStr] || [];
              const wDone = wc.some(id => ws.some(h => h.id === id));
              if (!wDone) { broken = true; break; }
            }
            walkDate.setDate(walkDate.getDate() + 1);
          }
          if (broken) {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          } else {
            tempStreak++;
          }
        }
        prevDate = d;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // 5. Monthly Completion Rate — scheduled days only
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = getDaysInMonthCount(currentYear, currentMonth);
    
    let monthlyCompletedScheduled = 0;
    let monthlyTotalScheduled = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      if (date > now) break; // don't count future days
      const scheduled = getScheduledHabitsForDate(habits, date);
      const dateStr = formatDateKey(date);
      const dayCompletions = completions[dateStr] || [];
      const completed = dayCompletions.filter(id => scheduled.some(h => h.id === id));
      monthlyTotalScheduled += scheduled.length;
      monthlyCompletedScheduled += completed.length;
    }

    const monthlyCompletionRate = monthlyTotalScheduled > 0
      ? Math.round((monthlyCompletedScheduled / monthlyTotalScheduled) * 100)
      : 0;

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
