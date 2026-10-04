import { useEffect, useRef } from "react";
import { consumeReturnNode, peekReturnNode } from "@/utils/returnNode";
import { getHomeGroupLabel, HOME_ALL_GROUP, HOME_ALL_REGION } from "@/utils/homeNodes";
import { getDisplayRegionCode } from "@/utils/geo";
import type { HomeNodeSummary } from "@/services/wsStore";

export interface UseReturnNodeScrollParams {
  isReady: boolean;
  nodes: HomeNodeSummary[];
  orderedUuids: string[];
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
}

/**
 * 判断目标返回节点是否属于不同分组，若是则返回需要切换的目标分组名。
 */
export function resolveTargetReturnGroup(
  targetUuid: string | null | undefined,
  nodes: HomeNodeSummary[],
  currentGroup: string,
): string | null {
  if (!targetUuid) return null;
  const targetNode = nodes.find((n) => n.uuid === targetUuid);
  if (!targetNode) return null;
  const targetGroup = getHomeGroupLabel(targetNode.group);
  if (currentGroup !== HOME_ALL_GROUP && currentGroup !== targetGroup) {
    return targetGroup;
  }
  return null;
}

/**
 * 判断目标返回节点是否属于不同地区，若是则返回需要切换的地区（全部）。
 */
export function resolveTargetReturnRegion(
  targetUuid: string | null | undefined,
  nodes: HomeNodeSummary[],
  currentRegion: string,
): string | null {
  if (!targetUuid) return null;
  const targetNode = nodes.find((n) => n.uuid === targetUuid);
  if (!targetNode) return null;
  const targetRegion = getDisplayRegionCode(targetNode.region);
  if (currentRegion !== HOME_ALL_REGION && currentRegion !== targetRegion) {
    return HOME_ALL_REGION;
  }
  return null;
}

/**
 * 手机端与桌面端从服务器详情页返回首页时，自动定位并滚动回刚才点击进入的服务器卡片。
 *
 * 1. 若当前分组或地区筛选排除了该服务器，自动调整分组/地区使其可见；
 * 2. 节点渲染就绪后，平滑/即时滚动到该节点卡片位置，避免返回默认停留在首张卡片。
 */
export function useReturnNodeScroll({
  isReady,
  nodes,
  orderedUuids,
  selectedGroup,
  onSelectGroup,
  selectedRegion,
  onSelectRegion,
}: UseReturnNodeScrollParams) {
  const filterAdjustedRef = useRef(false);
  const scrolledRef = useRef(false);

  // 1. 如果有返回的目标节点，但当前的分组或地区筛选把它隐藏了，自动调整分组/地区以确保目标节点可见
  useEffect(() => {
    if (!isReady || nodes.length === 0 || filterAdjustedRef.current) return;
    const targetUuid = peekReturnNode();
    if (!targetUuid) return;

    filterAdjustedRef.current = true;

    const neededGroup = resolveTargetReturnGroup(targetUuid, nodes, selectedGroup);
    if (neededGroup) {
      onSelectGroup(neededGroup);
    }

    const neededRegion = resolveTargetReturnRegion(targetUuid, nodes, selectedRegion);
    if (neededRegion) {
      onSelectRegion(neededRegion);
    }
  }, [isReady, nodes, selectedGroup, selectedRegion, onSelectGroup, onSelectRegion]);

  // 2. 当目标节点出现在 orderedUuids 并渲染进 DOM 后，定位滚动到该节点卡片所在位置
  useEffect(() => {
    if (!isReady || orderedUuids.length === 0 || scrolledRef.current) return;
    const targetUuid = peekReturnNode();
    if (!targetUuid || !orderedUuids.includes(targetUuid)) return;

    scrolledRef.current = true;
    consumeReturnNode();

    const scrollToNode = () => {
      const el =
        document.getElementById(`node-${targetUuid}`) ??
        document.querySelector<HTMLElement>(`[data-node-uuid="${targetUuid}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "auto" });
        return true;
      }
      return false;
    };

    let rafId: number | undefined;
    let timer1: number | undefined;
    let timer2: number | undefined;

    if (typeof window !== "undefined") {
      rafId = window.requestAnimationFrame(() => {
        if (!scrollToNode()) {
          timer1 = window.setTimeout(scrollToNode, 60);
        }
        timer2 = window.setTimeout(scrollToNode, 180);
      });
    }

    return () => {
      if (rafId != null && typeof window !== "undefined") window.cancelAnimationFrame(rafId);
      if (timer1 != null && typeof window !== "undefined") window.clearTimeout(timer1);
      if (timer2 != null && typeof window !== "undefined") window.clearTimeout(timer2);
    };
  }, [isReady, orderedUuids]);
}
