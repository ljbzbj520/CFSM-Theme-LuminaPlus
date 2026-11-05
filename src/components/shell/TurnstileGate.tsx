import { t } from "@/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/Spinner";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useTurnstileVerificationRequired } from "@/hooks/useTurnstileVerification";
import { getSiteConfig } from "@/services/api";
import {
  getTurnstileVerified,
  setTurnstileToken,
  subscribeTurnstileCredentialsCleared,
} from "@/services/cfsm/config";

/**
 * Turnstile 人机验证。
 *
 * 站点开启全局 API 验证后，未携带验证凭证的请求会被后端以 403 拒绝，主题必须自己完成一次
 * 验证：渲染 Turnstile 组件 → 拿到一次性 token → 带着它请求 `/api/config` →
 * 响应里的 `turnstile_verified` 是加密凭证，缓存约一小时，后续请求复用（见 http.ts）。
 */

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error(t("turnstile.scriptFailed")));
    };
    document.head.append(script);
  });
  return scriptPromise;
}

export function TurnstileGate() {
  const { data: config } = usePublicConfig();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  /**
   * 点「重试」就加一，下面的 effect 据此把验证组件拆掉重新渲染。
   *
   * 出错后组件自己不会再给新 token：token 只能用一次，提交被后端拒了组件还停在「已通过」；
   * 脚本没加载出来就根本没有组件。原来只能刷新整个页面。
   */
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  // 凭证过期后，首页轮询、保存到后端等请求会被 403，http 层清掉凭证并通知这里：重新拉 config，
  // 让下面的判断拿到 `verified: false`，弹窗重新出来。
  useEffect(
    () =>
      subscribeTurnstileCredentialsCleared(() => {
        void queryClient.invalidateQueries({ queryKey: ["public"] });
      }),
    [queryClient],
  );

  // 已经拿到缓存凭证或本次请求已通过验证时不打扰用户。AppShell 用同一个口径决定数据页挂不挂。
  const needsVerification = useTurnstileVerificationRequired();

  const submitToken = useCallback(
    async (token: string) => {
      setVerifying(true);
      setError(null);
      try {
        // 带上一次性 token 请求 config，成功后 http 层会把返回的凭证缓存下来。
        setTurnstileToken(token);
        await getSiteConfig();
        if (!getTurnstileVerified()) {
          throw new Error(t("turnstile.rejected"));
        }
        await queryClient.invalidateQueries();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : t("turnstile.failed"));
      } finally {
        setVerifying(false);
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (!needsVerification || !config) return;

    let cancelled = false;
    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: config.turnstile_site_key,
          theme: "auto",
          callback: (token) => {
            void submitToken(token);
          },
          "error-callback": () => setError(t("turnstile.widgetFailed")),
          "expired-callback": () => setError(t("turnstile.expired")),
        });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t("turnstile.widgetFailed"));
        }
      });

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // 组件已被卸载时忽略。
        }
      }
    };
  }, [attempt, config, needsVerification, submitToken]);

  if (!needsVerification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-0)]/90 backdrop-blur-sm">
      <div className="surface-inset flex w-[min(22rem,90vw)] flex-col items-center gap-4 px-6 py-7 text-center">
        <div className="space-y-1.5">
          <div className="text-[15px] font-semibold text-[var(--text-primary)]">
            {t("turnstile.title")}
          </div>
          <p className="text-[13px] text-[var(--text-secondary)]">
            {t("turnstile.hint")}
          </p>
        </div>
        <div ref={containerRef} />
        {verifying && <Spinner size={18} />}
        {error && (
          <p role="alert" className="text-[12px] text-[var(--status-error)]">
            {error}
          </p>
        )}
        {error && !verifying && (
          <button
            type="button"
            onClick={retry}
            className="control-button px-4 py-2 text-[13px] font-medium"
          >
            {t("common.retry")}
          </button>
        )}
      </div>
    </div>
  );
}
