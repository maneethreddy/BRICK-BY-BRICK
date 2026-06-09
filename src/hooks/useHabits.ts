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
import { formatDateKey, getTodayStr, getYesterdayStr, getDaysInMonthCount, isDateLoggable } from '../utils/dateUtils';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
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
  const addHabit = async (name: string, emoji: string) => {
    if (!user) throw new Error("User must be logged in to create a habit.");
    await addDoc(collection(db, 'habits'), {
      userId: user.uid,
      name,
      emoji: emoji.trim() || '📝',
      createdAt: new Date().toISOString()
    });
  };

  const editHabit = async (id: string, name: string, emoji: string) => {
    if (!user) throw new Error("User must be logged in to edit a habit.");
    await updateDoc(doc(db, 'habits', id), {
      name,
      emoji: emoji.trim()
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
      version: '1.1',
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
    const yesterdayStr = getYesterdayStr();
    
    // 1. Today's Score
    const completedToday = completions[todayStr] || [];
    const validCompletedToday = completedToday.filter(id => habits.some(h => h.id === id));
    const todayScore = habits.length > 0 
      ? Math.round((validCompletedToday.length / habits.length) * 100) 
      : 0;

    // 2. Total completions count
    let totalCompletionsCount = 0;
    Object.values(completions).forEach(ids => {
      totalCompletionsCount += ids.filter(id => habits.some(h => h.id === id)).length;
    });

    // 3. Current Streak
    let currentStreak = 0;
    let checkDate = new Date();
    
    const hasCompletionsToday = (completions[todayStr] || [])
      .some(id => habits.some(h => h.id === id));
      
    const hasCompletionsYesterday = (completions[yesterdayStr] || [])
      .some(id => habits.some(h => h.id === id));

    if (hasCompletionsToday) {
      currentStreak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const dateStr = formatDateKey(checkDate);
        const hasCompletions = (completions[dateStr] || [])
          .some(id => habits.some(h => h.id === id));
          
        if (hasCompletions) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else if (hasCompletionsYesterday) {
      currentStreak = 1;
      checkDate.setDate(checkDate.getDate() - 2);
      while (true) {
        const dateStr = formatDateKey(checkDate);
        const hasCompletions = (completions[dateStr] || [])
          .some(id => habits.some(h => h.id === id));
          
        if (hasCompletions) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // 4. Longest Streak
    const completedDates = Object.keys(completions)
      .filter(dateStr => (completions[dateStr] || []).some(id => habits.some(h => h.id === id)))
      .sort();

    let longestStreak = 0;
    if (completedDates.length > 0) {
      let tempStreak = 1;
      let prevDate = new Date(completedDates[0]);
      
      for (let i = 1; i < completedDates.length; i++) {
        const currDate = new Date(completedDates[i]);
        const diffTime = currDate.getTime() - prevDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
        prevDate = currDate;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // 5. Monthly Completion Rate
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = getDaysInMonthCount(currentYear, currentMonth);
    
    let monthlyCompletions = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateKey(new Date(currentYear, currentMonth, day));
      const dayCompletions = completions[dateStr] || [];
      monthlyCompletions += dayCompletions.filter(id => habits.some(h => h.id === id)).length;
    }
    
    const totalPossibleMonthly = habits.length * daysInMonth;
    const monthlyCompletionRate = totalPossibleMonthly > 0
      ? Math.round((monthlyCompletions / totalPossibleMonthly) * 100)
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
