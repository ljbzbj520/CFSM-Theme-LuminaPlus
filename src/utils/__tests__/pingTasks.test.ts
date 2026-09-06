import { describe, expect, it } from "vitest";
import { CARRIER_TASKS } from "@/services/cfsm/mappers";
import {
  HOMEPAGE_MULTI_PING_MAX_COUNT,
  isHomepageMultiPingConfigured,
  normalizeHomepageMultiPingTaskIds,
  invertHomepagePingTaskBindings,
  hasHomepagePingTaskBinding,
  normalizeHomepagePingTaskBindings,
  resolveHomepagePingSelections,
  resolveHomepagePingTaskIdsByClient,
} from "@/utils/pingTasks";

describe("homepage ping task bindings", () => {
  it("accepts only positive decimal safe integers", () => {
    expect(
      normalizeHomepagePingTaskBindings({
        "1e3": ["exponent"],
        "1.5": ["fraction"],
        "0x10": ["hex"],
        "9007199254740992": ["unsafe"],
        "42": ["valid"],
      }),
    ).toEqual({ "42": ["valid"] });
  });

  it("merges IDs that normalize to the same decimal integer", () => {
    expect(
      normalizeHomepagePingTaskBindings({
        "01": ["node-a", "node-b"],
        "1": ["node-b", "node-c"],
      }),
    ).toEqual({ "1": ["node-b", "node-c", "node-a"] });
  });

  it("inverts normalized bindings and gives the lowest task ID precedence", () => {
    expect(
      invertHomepagePingTaskBindings({
        "02": ["node-a"],
        "1": ["node-a", "node-b"],
      }),
    ).toEqual(
      new Map([
        ["node-a", 1],
        ["node-b", 1],
      ]),
    );
  });

  it("reuses the inverted binding index for a stable bindings object", () => {
    const bindings = { "8": ["node-a"], "9": ["node-b"] };
    expect(invertHomepagePingTaskBindings(bindings)).toBe(
      invertHomepagePingTaskBindings(bindings),
    );
  });

  it("reports a binding before overview data has loaded", () => {
    const bindings = { "8": ["node-a"], "9": ["node-b"] };
    expect(hasHomepagePingTaskBinding("node-a", bindings)).toBe(true);
    expect(hasHomepagePingTaskBinding("node-c", bindings)).toBe(false);
  });

  it("normalizes the global selection in display order, capped at the max line count", () => {
    // 去重、保序、按上限截断。上限是四条（后端就四条线路），不再是写死的三条。
    expect(normalizeHomepageMultiPingTaskIds(["3", 1, 3, 2, 4])).toEqual([3, 1, 2, 4]);
    expect(normalizeHomepageMultiPingTaskIds([4, 3, 2, 1, 5])).toEqual([4, 3, 2, 1]);
  });

  it("treats any non-empty selection as configured (1 line is valid)", () => {
    expect(isHomepageMultiPingConfigured([1])).toBe(true);
    expect(isHomepageMultiPingConfigured([1, 2, 3, 4])).toBe(true);
    expect(isHomepageMultiPingConfigured([])).toBe(false);
  });

  it("keeps the max line count aligned with the carrier lines the backend actually has", () => {
    // 后端以后加线路（CARRIER_TASKS 变长），这条会先失败，提醒把上限一起抬上去。
    expect(HOMEPAGE_MULTI_PING_MAX_COUNT).toBe(CARRIER_TASKS.length);
  });

  it("uses the selected lines for every node whatever the count", () => {
    expect(
      resolveHomepagePingTaskIdsByClient(["node-a"], { "8": ["node-a"] }, [2]),
    ).toEqual(new Map([["node-a", [2]]]));
    expect(
      resolveHomepagePingTaskIdsByClient(["node-a"], {}, [4, 1]),
    ).toEqual(new Map([["node-a", [4, 1]]]));
  });

  it("uses the same three global tasks for every node and otherwise keeps single bindings", () => {
    const bindings = { "8": ["node-a"], "9": ["node-b"] };
    expect(
      resolveHomepagePingTaskIdsByClient(["node-a", "node-b"], bindings, [3, 1, 2]),
    ).toEqual(
      new Map([
        ["node-a", [3, 1, 2]],
        ["node-b", [3, 1, 2]],
      ]),
    );
    expect(resolveHomepagePingTaskIdsByClient(["node-a", "node-b"], bindings)).toEqual(
      new Map([
        ["node-a", [8]],
        ["node-b", [9]],
      ]),
    );
  });

  it("requests either global multi-ping tasks or per-node single bindings, never both", () => {
    const multiSelections = resolveHomepagePingSelections(
      ["node-a", "node-b"],
      { "8": ["node-a"], "9": ["node-b"] },
      [3, 1, 2],
    );

    expect(multiSelections.singleTaskIdsByClient).toEqual(new Map());
    expect(multiSelections.multiTaskIdsByClient).toEqual(
      new Map([
        ["node-a", [3, 1, 2]],
        ["node-b", [3, 1, 2]],
      ]),
    );
    expect(multiSelections.requestedTaskIdsByClient).toBe(
      multiSelections.multiTaskIdsByClient,
    );

    const singleSelections = resolveHomepagePingSelections(
      ["node-a", "node-b"],
      { "8": ["node-a"], "9": ["node-b"] },
    );
    expect(singleSelections.singleTaskIdsByClient).toEqual(
      new Map([
        ["node-a", [8]],
        ["node-b", [9]],
      ]),
    );
    expect(singleSelections.multiTaskIdsByClient).toEqual(new Map());
    expect(singleSelections.requestedTaskIdsByClient).toBe(
      singleSelections.singleTaskIdsByClient,
    );
  });
});
