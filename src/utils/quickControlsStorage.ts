const STORAGE_KEY = "cfsm-luminaplus:quick-controls-expanded";

/**
 * 首页右上角快捷栏上次是不是展开着（只记在本机浏览器）。
 *
 * 反复刷新页面试配置的人每次都要多点一下展开（issue #6），所以记住上次的状态；不做成设置项。
 * 手机上也记（站长 2026-10-15：快捷栏能关掉几个按钮之后，窄屏展开不一定盖住站点名）；
 * 真盖住时由首页把站点名藏起来（Home.tsx 的 isBrandCovered）。
 */
export function readQuickControlsExpanded(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeQuickControlsExpanded(expanded: boolean): void {
  try {
    if (expanded) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 隐私模式等写不进去时就不记，下次照旧收起。
  }
}
