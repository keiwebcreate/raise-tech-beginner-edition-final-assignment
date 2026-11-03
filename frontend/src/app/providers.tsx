"use client";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { theme } from "@/shared/theme";

// 全画面で使う準備：Mantine（見た目）・通知・TanStack Query（サーバーのデータの係）
export function Providers({ children }: { children: ReactNode }) {
  // 画面ごとに作り直さないよう、最初の1回だけ作る
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // 30秒は新しいとみなす。失敗したら1回だけやり直す（詳細設計書 5.5）
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        {/* 成功は4秒で消える。エラーは各所で autoClose: false にする（画面設計書 3.4） */}
        <Notifications position="top-right" autoClose={4000} />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
}
