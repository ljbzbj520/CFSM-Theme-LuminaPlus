import { lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { NodeGrid } from "@/components/node/NodeGrid";
import { FloatingControls } from "@/components/shell/FloatingControls";
import { Spinner } from "@/components/ui/Spinner";
import { useNodeStoreStatus } from "@/hooks/useNode";
import { useThemeSettings } from "@/hooks/useThemeSettings";

const ThemeManage = lazy(() =>
  import("@/pages/ThemeManage").then((module) => ({ default: module.ThemeManage })),
);

/** 两个元素之间至少留这么宽，再近就当作盖住了。 */
const BRAND_CLEARANCE_PX = 8;

/**
 * 展开的快捷栏会不会盖住站点名（两者都绝对定位在首页顶上同一行）。按实际宽度算，不按视口：
 * 快捷栏的按钮能在设置里关掉，手机上只留两三个时站点名放得下，没必要藏。
 * 站点名用 offsetLeft / offsetWidth（藏起来时有 translateX，getBoundingClientRect 会跟着偏，来回跳）；
 * 按钮组用 scrollWidth（展开动画中 max-width 还没到位，取的是内容本身的宽度）。
 */
function isBrandCovered(root: HTMLElement): boolean {
  const brand = root.querySelector<HTMLElement>(".home-brand");
  const trigger = root.querySelector<HTMLElement>(".floating-controls-trigger");
  const actions = root.querySelector<HTMLElement>(".floating-controls-actions");
  if (!brand || !trigger || !actions) return false;
  const parent = brand.offsetParent as HTMLElement | null;
  const brandRight = (parent?.getBoundingClientRect().left ?? 0) + brand.offsetLeft + brand.offsetWidth;
  const actionsLeft = trigger.getBoundingClientRect().left - BRAND_CLEARANCE_PX - actions.scrollWidth;
  return brandRight > actionsLeft - BRAND_CLEARANCE_PX;
}

function HomeDashboard() {
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [brandCovered, setBrandCovered] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const themeSettings = useThemeSettings();
  const { hydrated: storeHydrated } = useNodeStoreStatus();
  const homeReady = themeSettings.isReady && storeHydrated;

  useLayoutEffect(() => {
    const root = dashboardRef.current;
    if (!controlsExpanded || !root) return;
    const measure = () => setBrandCovered(isBrandCovered(root));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [controlsExpanded]);

  return (
    <div
      ref={dashboardRef}
      className={`home-dashboard relative pb-2${controlsExpanded && brandCovered ? " is-controls-expanded" : ""}`}
    >
      {homeReady && <FloatingControls onExpandedChange={setControlsExpanded} />}
      <NodeGrid />
    </div>
  );
}

export function Home() {
  const [searchParams] = useSearchParams();
  const isThemeManageView = searchParams.get("view") === "theme-manage";

  // 主题设置只写本机浏览器，不需要登录态；管理后台入口另行跳转 /admin#/admin。
  if (isThemeManageView) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner size={24} />
          </div>
        }
      >
        <ThemeManage />
      </Suspense>
    );
  }

  return <HomeDashboard />;
}
