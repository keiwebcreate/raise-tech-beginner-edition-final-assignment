"use client";

import { ServerErrorContent } from "@/shared/components/ErrorPage";

// S-07 エラー（500）：(main) の外（ログイン画面など）で起きたとき
export default function RootError() {
  return <ServerErrorContent />;
}
