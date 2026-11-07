import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as baseRender } from "@testing-library/react";
import type { ReactElement } from "react";
import { theme } from "@/shared/theme";

// テストで部品を表示するときの共通の準備（Mantine と TanStack Query）
export function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return baseRender(
    <QueryClientProvider client={queryClient}>
      {/* env="test"：ダイアログなどの動きを止めて、すぐに表示する */}
      <MantineProvider theme={theme} env="test">
        {ui}
      </MantineProvider>
    </QueryClientProvider>,
  );
}
