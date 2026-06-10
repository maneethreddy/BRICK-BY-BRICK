// Timezone-safe Date utilities for Habit Tracker

/**
 * Format a Date object to "YYYY-MM-DD" in local time to avoid timezone shifts.
 */
export const formatDateKey = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Get today's date string in "YYYY-MM-DD" local format.
 */
export const getTodayStr = (): string => {
  return formatDateKey(new Date());
};

/**
 * Get yesterday's date string in "YYYY-MM-DD" local format.
 */
export const getYesterdayStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
};

/**
 * Get the number of days in a given month of a year.
 * @param year e.g. 2026
 * @param month 0-indexed month (0 = January, 11 = December)
 */
export const getDaysInMonthCount = (year: number, month: number): number => {
  // Day 0 of the next month gives the last day of the current month
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Generate an array of Date objects for each day of the specified month.
 */
export const getDatesInMonth = (year: number, month: number): Date[] => {
  const daysCount = getDaysInMonthCount(year, month);
  const dates: Date[] = [];
  for (let d = 1; d <= daysCount; d++) {
    dates.push(new Date(year, month, d));
  }
  return dates;
};

/**
 * Determine if a habit completion can be logged for the given date.
 * User can log:
 * 1. Today's events.
 * 2. Yesterday's events, but only if the current local time is before 2:00 AM.
 */
export const isDateLoggable = (date: Date): boolean => {
  const now = new Date();
  const targetDateStr = formatDateKey(date);
  const todayDateStr = formatDateKey(now);

  if (targetDateStr === todayDateStr) {
    return true;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayDateStr = formatDateKey(yesterday);

  if (targetDateStr === yesterdayDateStr) {
    return now.getHours() < 2;
  }

  return false;
};

/**
 * Generate an array of Dates for a GitHub-style heatmap for a specific calendar year.
 * Returns an array representing the full calendar year (Jan 1 to Dec 31),
 * aligned to start on the Sunday of the first week and end on the Saturday of the last week.
 */
export const getHeatmapDates = (year: number): Date[] => {
  // Start date: January 1 of the selected year
  const start = new Date(year, 0, 1);
  start.setHours(12, 0, 0, 0);
  
  // Shift start back to the nearest Sunday (getDay() === 0)
  const dayOfWeek = start.getDay();
  if (dayOfWeek > 0) {
    start.setDate(start.getDate() - dayOfWeek);
  }
  start.setHours(12, 0, 0, 0);
  
  const dates: Date[] = [];
  const currentDate = new Date(start);
  currentDate.setHours(12, 0, 0, 0);
  
  // End date: December 31 of the selected year
  const end = new Date(year, 11, 31);
  const endDayOfWeek = end.getDay();
  if (endDayOfWeek < 6) {
    end.setDate(end.getDate() + (6 - endDayOfWeek));
  }
  end.setHours(12, 0, 0, 0);
  
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(12, 0, 0, 0);
  }
  
  return dates;
};

/**
 * Get names of months for display.
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get short names of weekdays.
 */
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
