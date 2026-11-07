"use client";

import { ServerErrorContent } from "@/shared/components/ErrorPage";

// S-07 エラー（500）：データを読み込めないときなど。ヘッダーは (main)/layout.tsx が出す
export default function MainError() {
  return <ServerErrorContent />;
}
