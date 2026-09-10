import { describe, expect, it } from "vitest";
import {
  computeTrafficUsed,
  formatTrafficResetDays,
  getTrafficResetDays,
  resolveTrafficUsage,
  trafficTypeLabel,
} from "@/utils/traffic";

describe("computeTrafficUsed", () => {
  it("reduces up/down per type", () => {
    expect(computeTrafficUsed("sum", 30, 70)).toBe(100);
    expect(computeTrafficUsed("up", 30, 70)).toBe(30);
    expect(computeTrafficUsed("down", 30, 70)).toBe(70);
    expect(computeTrafficUsed("max", 30, 70)).toBe(70);
    expect(computeTrafficUsed("min", 30, 70)).toBe(30);
  });

  it("defaults to max for empty/unknown (backend gorm default)", () => {
    expect(computeTrafficUsed("", 30, 70)).toBe(70);
    expect(computeTrafficUsed(undefined, 80, 20)).toBe(80);
    expect(computeTrafficUsed(null, 80, 20)).toBe(80);
    expect(computeTrafficUsed("weird", 80, 20)).toBe(80);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(computeTrafficUsed(" SUM ", 30, 70)).toBe(100);
    expect(computeTrafficUsed("Up", 30, 70)).toBe(30);
  });

  it("guards NaN/negative inputs to 0", () => {
    expect(computeTrafficUsed("sum", Number.NaN, 70)).toBe(70);
    expect(computeTrafficUsed("sum", -5, 70)).toBe(70);
    expect(computeTrafficUsed("min", -5, 70)).toBe(0);
  });
});

describe("resolveTrafficUsage", () => {
  it("derives used/remaining/fraction from a limit", () => {
    const usage = resolveTrafficUsage("sum", 30, 70, 200);
    expect(usage.used).toBe(100);
    expect(usage.limit).toBe(200);
    expect(usage.unlimited).toBe(false);
    expect(usage.remaining).toBe(100);
    expect(usage.fraction).toBe(0.5);
  });

  it("reduces by type before measuring against the limit", () => {
    expect(resolveTrafficUsage("max", 30, 70, 200).used).toBe(70);
    expect(resolveTrafficUsage("up", 30, 70, 200).used).toBe(30);
  });

  it("treats limit <= 0 as unlimited", () => {
    const usage = resolveTrafficUsage("sum", 30, 70, 0);
    expect(usage.unlimited).toBe(true);
    expect(usage.remaining).toBe(0);
    expect(usage.fraction).toBe(0);
  });

  it("clamps fraction and remaining when over the limit", () => {
    const usage = resolveTrafficUsage("sum", 150, 100, 200);
    expect(usage.used).toBe(250);
    expect(usage.fraction).toBe(1);
    expect(usage.remaining).toBe(0);
  });
});

describe("trafficTypeLabel", () => {
  it("labels each known type", () => {
    expect(trafficTypeLabel("up")).toBe("仅上行");
    expect(trafficTypeLabel("down")).toBe("仅下行");
    expect(trafficTypeLabel("sum")).toBe("上行+下行");
    expect(trafficTypeLabel("min")).toBe("上下取小");
    expect(trafficTypeLabel("max")).toBe("上下取大");
  });

  it("falls back to max label for empty/unknown", () => {
    expect(trafficTypeLabel("")).toBe("上下取大");
    expect(trafficTypeLabel(undefined)).toBe("上下取大");
  });
});

describe("getTrafficResetDays & formatTrafficResetDays", () => {
  it("returns null for invalid, zero, or unconfigured reset days", () => {
    expect(getTrafficResetDays(0)).toBeNull();
    expect(getTrafficResetDays(null)).toBeNull();
    expect(getTrafficResetDays(undefined)).toBeNull();
    expect(getTrafficResetDays(-1)).toBeNull();
    expect(getTrafficResetDays(32)).toBeNull();
    expect(formatTrafficResetDays(0)).toBeNull();
  });

  it("calculates remaining days when reset day is later in current month", () => {
    // 2026-09-10, reset on 15th -> 5 days remaining
    const now = new Date(2026, 8, 10, 12, 0, 0).getTime();
    expect(getTrafficResetDays(15, now)).toBe(5);
    expect(formatTrafficResetDays(15, now)).toBe("余5天重置");
  });

  it("returns 0 and '今日重置' when reset day is today", () => {
    const now = new Date(2026, 8, 10, 12, 0, 0).getTime();
    expect(getTrafficResetDays(10, now)).toBe(0);
    expect(formatTrafficResetDays(10, now)).toBe("今日重置");
  });

  it("calculates remaining days wrapping to next month when reset day has passed", () => {
    // 2026-09-10 (Sept has 30 days), reset on 1st -> (30 - 10) + 1 = 21 days
    const now = new Date(2026, 8, 10, 12, 0, 0).getTime();
    expect(getTrafficResetDays(1, now)).toBe(21);
    expect(formatTrafficResetDays(1, now)).toBe("余21天重置");
  });

  it("handles month clamping for shorter months (e.g. Feb)", () => {
    // 2026-02-15 (Feb 2026 has 28 days), reset on 31st -> clamped to 28th -> 28 - 15 = 13 days
    const now = new Date(2026, 1, 15, 12, 0, 0).getTime();
    expect(getTrafficResetDays(31, now)).toBe(13);
    expect(formatTrafficResetDays(31, now)).toBe("余13天重置");
  });

  it("handles year transition from December to January", () => {
    // 2026-12-25 (Dec has 31 days), reset on 5th -> (31 - 25) + 5 = 11 days
    const now = new Date(2026, 11, 25, 12, 0, 0).getTime();
    expect(getTrafficResetDays(5, now)).toBe(11);
    expect(formatTrafficResetDays(5, now)).toBe("余11天重置");
  });
});

