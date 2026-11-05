import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "@/components/shell/ErrorBoundary";
import { useLanguage } from "@/i18n";
import { queryClient } from "@/services/queryClient";
import { router } from "@/router";

export function App() {
  // 语言变了整棵树重新挂载：组件和 useMemo 里缓存的文案都跟着换。只在配置到手（内容出来之前）和站长改了默认语言时发生。
  const language = useLanguage();
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider key={language} router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
