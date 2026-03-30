import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
} from "date-fns";

export type PeriodKey = "today" | "yesterday" | "last7" | "mtd" | "lastMonth" | "lastWeek";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface PeriodOption {
  key: PeriodKey;
  label: string;
}

export const periodOptions: PeriodOption[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 Days" },
  { key: "mtd", label: "MTD" },
  { key: "lastMonth", label: "Last Month" },
  { key: "lastWeek", label: "Last Week" },
];

export function getDateRange(period: PeriodKey, now = new Date()): DateRange {
  switch (period) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "last7":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "mtd":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "lastMonth": {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case "lastWeek": {
      const lw = subWeeks(now, 1);
      return { from: startOfWeek(lw, { weekStartsOn: 1 }), to: endOfWeek(lw, { weekStartsOn: 1 }) };
    }
  }
}

export function getPreviousDateRange(period: PeriodKey, now = new Date()): DateRange {
  switch (period) {
    case "today":
      return getDateRange("yesterday", now);
    case "yesterday": {
      const d = subDays(now, 2);
      return { from: startOfDay(d), to: endOfDay(d) };
    }
    case "last7":
      return { from: startOfDay(subDays(now, 13)), to: endOfDay(subDays(now, 7)) };
    case "mtd": {
      const lm = subMonths(now, 1);
      const dayOfMonth = now.getDate();
      return { from: startOfMonth(lm), to: endOfDay(new Date(lm.getFullYear(), lm.getMonth(), Math.min(dayOfMonth, endOfMonth(lm).getDate()))) };
    }
    case "lastMonth": {
      const twoMonthsAgo = subMonths(now, 2);
      return { from: startOfMonth(twoMonthsAgo), to: endOfMonth(twoMonthsAgo) };
    }
    case "lastWeek": {
      const twoWeeksAgo = subWeeks(now, 2);
      return { from: startOfWeek(twoWeeksAgo, { weekStartsOn: 1 }), to: endOfWeek(twoWeeksAgo, { weekStartsOn: 1 }) };
    }
  }
}
