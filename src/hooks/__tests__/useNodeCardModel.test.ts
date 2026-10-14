import { describe, expect, it } from "vitest";
import { shouldRenderHomepagePingBars } from "@/hooks/useNodeCardModel";
import { DEFAULT_CARRIER_NAMES, resolveCarrierNames } from "@/services/cfsm/mappers";

describe("homepage ping bar visibility", () => {
  it("keeps simulated ping bars visible without a real task binding", () => {
    expect(shouldRenderHomepagePingBars(false, true)).toBe(true);
    expect(shouldRenderHomepagePingBars(false, false)).toBe(false);
    expect(shouldRenderHomepagePingBars(true, false)).toBe(true);
  });
});

describe("carrier names resolving priority", () => {
  const metaCarrierNames = { ct: "旧电信", cu: "旧联通" };
  const baseCarrierNames = DEFAULT_CARRIER_NAMES;

  it("当节点在主题设置中显式清空为 {} 时，优先使用全局默认名称，不退回旧 meta", () => {
    const custom = {};
    const effective = custom !== undefined
      ? resolveCarrierNames(custom, baseCarrierNames)
      : resolveCarrierNames(metaCarrierNames, baseCarrierNames);

    expect(effective.ct).toBe("电信");
    expect(effective.cu).toBe("联通");
  });

  it("当节点在主题设置中未配置时（undefined），正常退回旧 meta", () => {
    const custom = undefined;
    const effective = custom !== undefined
      ? resolveCarrierNames(custom, baseCarrierNames)
      : resolveCarrierNames(metaCarrierNames, baseCarrierNames);

    expect(effective.ct).toBe("旧电信");
    expect(effective.cu).toBe("旧联通");
  });
});
