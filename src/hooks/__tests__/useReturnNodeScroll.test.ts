import { describe, expect, it } from "vitest";
import {
  resolveTargetReturnGroup,
  resolveTargetReturnRegion,
} from "@/hooks/useReturnNodeScroll";
import { HOME_ALL_GROUP, HOME_ALL_REGION } from "@/utils/homeNodes";
import type { HomeNodeSummary } from "@/services/wsStore";

function createMockNode(uuid: string, group = "默认", region = "HK"): HomeNodeSummary {
  return {
    uuid,
    group,
    region,
    online: true,
    hidden: false,
    weight: 0,
    trafficUp: 0,
    trafficDown: 0,
    netUp: 0,
    netDown: 0,
  };
}

describe("resolveTargetReturnGroup", () => {
  const nodes = [
    createMockNode("node-1", "组A", "HK"),
    createMockNode("node-2", "组B", "JP"),
    createMockNode("node-3", "组A", "US"),
  ];

  it("returns null when target uuid is empty or not found", () => {
    expect(resolveTargetReturnGroup(null, nodes, "组A")).toBeNull();
    expect(resolveTargetReturnGroup("node-999", nodes, "组A")).toBeNull();
  });

  it("returns null when current group is HOME_ALL_GROUP", () => {
    expect(resolveTargetReturnGroup("node-2", nodes, HOME_ALL_GROUP)).toBeNull();
  });

  it("returns null when target node is already in current group", () => {
    expect(resolveTargetReturnGroup("node-1", nodes, "组A")).toBeNull();
  });

  it("returns target group when target node belongs to a different group", () => {
    expect(resolveTargetReturnGroup("node-2", nodes, "组A")).toBe("组B");
  });
});

describe("resolveTargetReturnRegion", () => {
  const nodes = [
    createMockNode("node-1", "组A", "HK"),
    createMockNode("node-2", "组B", "JP"),
  ];

  it("returns null when current region is HOME_ALL_REGION", () => {
    expect(resolveTargetReturnRegion("node-2", nodes, HOME_ALL_REGION)).toBeNull();
  });

  it("returns null when target node is in current region", () => {
    expect(resolveTargetReturnRegion("node-1", nodes, "HK")).toBeNull();
  });

  it("returns HOME_ALL_REGION when target node is in a different region", () => {
    expect(resolveTargetReturnRegion("node-2", nodes, "HK")).toBe(HOME_ALL_REGION);
  });
});
