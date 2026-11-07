"use client";

import { MantineProvider } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { cssVariablesResolver, theme } from "@/shared/theme";

// 全画面で使う準備：Mantine（見た目）・通知・TanStack Query（サーバーのデータの係）
export function Providers({ children }: { children: ReactNode }) {
  // 画面ごとに作り直さないよう、最初の1回だけ作る
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 30秒は新しいとみなす。失敗したら1回だけやり直す（詳細設計書 5.5）
            staleTime: 30_000,
            // 見つからないなどの 4xx は、やり直しても同じなのでやり直さない
            retry: (failureCount, error) =>
              failureCount < 1 &&
              !(
                error instanceof ApiError &&
                error.status >= 400 &&
                error.status < 500
              ),
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        defaultColorScheme="auto"
        cssVariablesResolver={cssVariablesResolver}
      >
        <AppNotifications />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
}

// 成功は4秒で消える。エラーは各所で autoClose: false にする。
// 出る場所はパソコンは右上、スマホは上の中央（画面設計書 3.4）
function AppNotifications() {
  const isMobile = useMediaQuery("(max-width: 640px)", false, {
    getInitialValueInEffect: true,
  });

  return (
    <Notifications
      position={isMobile ? "top-center" : "top-right"}
      autoClose={4000}
    />
  );
}
