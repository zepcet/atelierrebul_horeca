import { describe, it, expect } from "vitest";
import { getDateRange, getPreviousDateRange, type PeriodKey } from "@/lib/date-periods";

const REFERENCE_DATE = new Date("2026-03-24T14:00:00.000Z");

describe("getDateRange", () => {
  it("today returns start and end of current day", () => {
    const range = getDateRange("today", REFERENCE_DATE);
    expect(range.from.getDate()).toBe(24);
    expect(range.to.getDate()).toBe(24);
    expect(range.from.getHours()).toBe(0);
    expect(range.to.getHours()).toBe(23);
  });

  it("yesterday returns previous day", () => {
    const range = getDateRange("yesterday", REFERENCE_DATE);
    expect(range.from.getDate()).toBe(23);
    expect(range.to.getDate()).toBe(23);
  });

  it("last7 returns 7-day window", () => {
    const range = getDateRange("last7", REFERENCE_DATE);
    const diffDays = Math.round((range.to.getTime() - range.from.getTime()) / 86400000);
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(7);
  });

  it("mtd starts from beginning of month", () => {
    const range = getDateRange("mtd", REFERENCE_DATE);
    expect(range.from.getDate()).toBe(1);
    expect(range.from.getMonth()).toBe(REFERENCE_DATE.getMonth());
  });

  it("lastMonth covers the entire previous month", () => {
    const range = getDateRange("lastMonth", REFERENCE_DATE);
    expect(range.from.getMonth()).toBe(1); // February
    expect(range.from.getDate()).toBe(1);
  });

  it("lastWeek returns Monday to Sunday of previous week", () => {
    const range = getDateRange("lastWeek", REFERENCE_DATE);
    expect(range.from.getDay()).toBe(1); // Monday
    expect(range.to.getDay()).toBe(0); // Sunday
  });
});

describe("getPreviousDateRange", () => {
  it("previous of today is yesterday", () => {
    const range = getPreviousDateRange("today", REFERENCE_DATE);
    expect(range.from.getDate()).toBe(23);
  });

  it("previous of yesterday is 2 days ago", () => {
    const range = getPreviousDateRange("yesterday", REFERENCE_DATE);
    expect(range.from.getDate()).toBe(22);
  });

  it("previous of last7 is 7 days before that", () => {
    const current = getDateRange("last7", REFERENCE_DATE);
    const previous = getPreviousDateRange("last7", REFERENCE_DATE);
    expect(previous.to.getTime()).toBeLessThan(current.from.getTime());
  });

  it("previous of lastMonth is two months ago", () => {
    const range = getPreviousDateRange("lastMonth", REFERENCE_DATE);
    expect(range.from.getMonth()).toBe(0); // January
  });

  const allPeriods: PeriodKey[] = ["today", "yesterday", "last7", "mtd", "lastMonth", "lastWeek"];
  allPeriods.forEach((period) => {
    it(`${period}: previous range ends before current range starts`, () => {
      const current = getDateRange(period, REFERENCE_DATE);
      const previous = getPreviousDateRange(period, REFERENCE_DATE);
      expect(previous.to.getTime()).toBeLessThanOrEqual(current.from.getTime());
    });
  });
});
