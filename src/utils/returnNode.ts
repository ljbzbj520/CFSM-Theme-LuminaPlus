export const RETURN_NODE_KEY = "cfsm-luminaplus:return-node-uuid";
export const SESSION_HOME_GROUP_KEY = "cfsm-luminaplus:home-selected-group";
export const SESSION_HOME_REGION_KEY = "cfsm-luminaplus:home-selected-region";

/**
 * 记录用户当前点击或正在查看的服务器 UUID。
 * 供手机端或桌面端返回首页时精准定位到该服务器。
 */
export function recordReturnNode(uuid: string): void {
  const trimmed = uuid?.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(RETURN_NODE_KEY, trimmed);
  } catch {
    // sessionStorage 不可用时静默忽略
  }
}

/**
 * 读取当前记录的目标返回服务器 UUID（不清除）。
 */
export function peekReturnNode(): string | null {
  try {
    return sessionStorage.getItem(RETURN_NODE_KEY);
  } catch {
    return null;
  }
}

/**
 * 读取并清除当前记录的目标返回服务器 UUID。
 */
export function consumeReturnNode(): string | null {
  try {
    const val = sessionStorage.getItem(RETURN_NODE_KEY);
    if (val) sessionStorage.removeItem(RETURN_NODE_KEY);
    return val;
  } catch {
    return null;
  }
}

/**
 * 清除当前记录的目标返回服务器 UUID。
 */
export function clearReturnNode(): void {
  try {
    sessionStorage.removeItem(RETURN_NODE_KEY);
  } catch {
    // ignore
  }
}

export function saveHomeGroup(group: string): void {
  try {
    sessionStorage.setItem(SESSION_HOME_GROUP_KEY, group);
  } catch {
    // ignore
  }
}

export function getSavedHomeGroup(): string | null {
  try {
    return sessionStorage.getItem(SESSION_HOME_GROUP_KEY);
  } catch {
    return null;
  }
}

export function saveHomeRegion(region: string): void {
  try {
    sessionStorage.setItem(SESSION_HOME_REGION_KEY, region);
  } catch {
    // ignore
  }
}

export function getSavedHomeRegion(): string | null {
  try {
    return sessionStorage.getItem(SESSION_HOME_REGION_KEY);
  } catch {
    return null;
  }
}
