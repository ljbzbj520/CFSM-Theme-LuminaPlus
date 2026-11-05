// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  readQuickControlsExpanded,
  writeQuickControlsExpanded,
} from "@/utils/quickControlsStorage";

const setWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
};

describe("quick controls expanded state", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setWidth(1440);
  });

  it("starts collapsed until the visitor has expanded it once", () => {
    expect(readQuickControlsExpanded()).toBe(false);
  });

  it("remembers the last state across reloads", () => {
    writeQuickControlsExpanded(true);
    expect(readQuickControlsExpanded()).toBe(true);

    writeQuickControlsExpanded(false);
    expect(readQuickControlsExpanded()).toBe(false);
  });

  it("remembers the state on narrow screens too", () => {
    writeQuickControlsExpanded(true);
    setWidth(375);
    expect(readQuickControlsExpanded()).toBe(true);
  });

  it("falls back to collapsed when storage is unavailable", () => {
    writeQuickControlsExpanded(true);
    // 整个换掉 window.localStorage，别去 spy 它的方法：本地（Node 26）用的是 vitest.setup 补的内存版，
    // CI 上是 jsdom 自己的实现，两边方法挂的位置不一样，spy 只会在其中一边生效。
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    try {
      expect(() => writeQuickControlsExpanded(false)).not.toThrow();
      expect(readQuickControlsExpanded()).toBe(false);
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
      else delete (window as unknown as Record<string, unknown>).localStorage;
    }
    // 存储恢复后，之前记下的状态还在（上面那次写入没成功，也没把它清掉）。
    expect(readQuickControlsExpanded()).toBe(true);
  });
});
