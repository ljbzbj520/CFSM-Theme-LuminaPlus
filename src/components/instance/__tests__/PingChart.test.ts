import { describe, expect, it } from "vitest";
import { resolvePingYRange, summarizePingRecords } from "@/components/instance/PingChart";
import type { PingRecord } from "@/types/cfsm";

function record(
  time: string,
  value: number,
  count: number,
  loss: number,
): PingRecord {
  return { task_id: 1, client: "node-a", time: Date.parse(time), value, count, loss };
}

describe("summarizePingRecords", () => {
  it("weights aggregate latency and loss by the represented sample counts", () => {
    const summary = summarizePingRecords([
      record("2026-01-01T00:00:00Z", 10, 10, 0),
      record("2026-01-01T00:01:00Z", 100, 2, 50),
      record("2026-01-01T00:02:00Z", -1, 5, 100),
    ]);

    expect(summary).toMatchObject({
      latest: 100,
      min: 10,
      max: 100,
      p50: 10,
      total: 17,
      lost: 6,
    });
    expect(summary.avg).toBeCloseTo(200 / 11, 8);
    expect(summary.p99).toBeCloseTo(91, 8);
    expect(summary.loss).toBeCloseTo((6 / 17) * 100, 8);
  });
});

describe("resolvePingYRange", () => {
  it("calculates auto range smoothly when no custom values provided", () => {
    const range = resolvePingYRange({ autoMin: 20, autoMax: 45 });
    expect(range[0]).toBe(0);
    expect(range[1]).toBeGreaterThanOrEqual(45);
  });

  it("prioritizes customMax when user locks max value to cut tall spikes", () => {
    const range = resolvePingYRange({ autoMin: 30, autoMax: 550, customMax: 100 });
    expect(range[0]).toBe(0);
    expect(range[1]).toBe(100);
  });

  it("prioritizes customMin and customMax simultaneously", () => {
    const range = resolvePingYRange({ autoMin: 10, autoMax: 500, customMin: 20, customMax: 80 });
    expect(range[0]).toBe(20);
    expect(range[1]).toBe(80);
  });

  it("protects against max <= min by ensuring at least a safe delta", () => {
    const range = resolvePingYRange({ autoMin: 10, autoMax: 50, customMin: 100, customMax: 50 });
    expect(range[0]).toBe(100);
    expect(range[1]).toBeGreaterThanOrEqual(105);
  });
});
