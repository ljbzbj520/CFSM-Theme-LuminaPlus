// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearReturnNode,
  consumeReturnNode,
  getSavedHomeGroup,
  getSavedHomeRegion,
  peekReturnNode,
  recordReturnNode,
  saveHomeGroup,
  saveHomeRegion,
} from "@/utils/returnNode";

describe("returnNode utility", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("records and peeks return node uuid", () => {
    recordReturnNode("node-tokyo-1");
    expect(peekReturnNode()).toBe("node-tokyo-1");
    expect(peekReturnNode()).toBe("node-tokyo-1");
  });

  it("consumes return node uuid only once", () => {
    recordReturnNode("node-sg-1");
    expect(consumeReturnNode()).toBe("node-sg-1");
    expect(peekReturnNode()).toBeNull();
    expect(consumeReturnNode()).toBeNull();
  });

  it("clears return node uuid", () => {
    recordReturnNode("node-hk-1");
    clearReturnNode();
    expect(peekReturnNode()).toBeNull();
  });

  it("handles empty or whitespace uuid gracefully", () => {
    recordReturnNode("");
    expect(peekReturnNode()).toBeNull();
    recordReturnNode("   ");
    expect(peekReturnNode()).toBeNull();
  });

  it("saves and retrieves home group", () => {
    expect(getSavedHomeGroup()).toBeNull();
    saveHomeGroup("香港");
    expect(getSavedHomeGroup()).toBe("香港");
  });

  it("saves and retrieves home region", () => {
    expect(getSavedHomeRegion()).toBeNull();
    saveHomeRegion("HK");
    expect(getSavedHomeRegion()).toBe("HK");
  });
});
