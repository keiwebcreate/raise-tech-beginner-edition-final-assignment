import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "@/shared/test/render";
import HomePage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/client")>()),
  apiFetch: vi.fn(() => new Promise(() => {})),
}));

it("トップ（/）はレシピ一覧の画面になる", () => {
  render(<HomePage />);

  expect(
    screen.getByRole("heading", { level: 1, name: "レシピ一覧" }),
  ).toBeInTheDocument();
});
