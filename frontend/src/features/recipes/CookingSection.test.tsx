import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/shared/api/client";
import type { CookingLog, Recipe } from "@/shared/api/types";
import { render } from "@/shared/test/render";
import { CookedButton } from "./CookedButton";
import { CookingSection } from "./CookingSection";

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/client")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

function log(id: number, cooked_on: string, note: string | null = null) {
  return { id, cooked_on, note } satisfies CookingLog;
}

function cooking(count: number, recent: CookingLog[]): Recipe["cooking"] {
  return {
    count,
    last_cooked_on: recent[0]?.cooked_on ?? null,
    recent_logs: recent,
  };
}

const recent = [
  log(5, "2026-11-03", "塩を減らした"),
  log(4, "2026-10-20"),
  log(3, "2026-09-28"),
];

beforeEach(() => {
  apiFetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

it("記録がなければ「まだありません」と出し、回数は出さない", () => {
  render(<CookingSection recipeId={12} cooking={cooking(0, [])} />);

  expect(screen.getByText("まだありません")).toBeInTheDocument();
  expect(screen.queryByText("最後に作った日")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("3件までなら全部出し、「ほかの記録を表示」は出さない", () => {
  render(<CookingSection recipeId={12} cooking={cooking(3, recent)} />);

  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(screen.getByText("塩を減らした")).toBeInTheDocument();
  expect(screen.getByText("11/3")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /ほかの記録を表示/ }),
  ).not.toBeInTheDocument();
  expect(apiFetchMock).not.toHaveBeenCalled();
});

it("4件以上なら残りの数を出し、押すと全部を取りに行って出す", async () => {
  const user = userEvent.setup();
  apiFetchMock.mockResolvedValueOnce({
    data: [...recent, log(2, "2026-08-01"), log(1, "2026-07-01", "最初")],
  });
  render(<CookingSection recipeId={12} cooking={cooking(5, recent)} />);

  expect(apiFetchMock).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "ほかの記録を表示（2件）" }),
  );

  expect(await screen.findByText("最初")).toBeInTheDocument();
  expect(apiFetchMock).toHaveBeenCalledWith("/api/recipes/12/cooking-logs");
  expect(screen.getAllByRole("listitem")).toHaveLength(5);
  expect(
    screen.queryByRole("button", { name: /ほかの記録を表示/ }),
  ).not.toBeInTheDocument();
});

it("削除は日付を見せて確かめてから呼ぶ", async () => {
  const user = userEvent.setup();
  render(<CookingSection recipeId={12} cooking={cooking(3, recent)} />);

  await user.click(
    screen.getByRole("button", { name: "2026/10/20 の記録を削除" }),
  );
  const dialog = await screen.findByRole("dialog", {
    name: "この記録を削除しますか？",
  });
  expect(dialog).toHaveTextContent("2026/10/20 の記録を削除します");
  expect(apiFetchMock).not.toHaveBeenCalled();

  apiFetchMock.mockResolvedValueOnce(undefined);
  await user.click(within(dialog).getByRole("button", { name: "削除する" }));

  await waitFor(() =>
    expect(apiFetchMock).toHaveBeenCalledWith("/api/cooking-logs/4", {
      method: "DELETE",
    }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "この記録を削除しますか？" }),
    ).not.toBeInTheDocument(),
  );
});

it("記録の窓は今日を初期値にして、メモと一緒に送る", async () => {
  const user = userEvent.setup();
  apiFetchMock.mockResolvedValueOnce(log(9, "2026-11-07", "おいしい"));
  const today = new Date();
  const expected = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  render(<CookedButton recipeId={12} />);

  await user.click(screen.getByRole("button", { name: "作った" }));
  const dialog = await screen.findByRole("dialog", {
    name: "作った記録を残す",
  });
  expect(
    within(dialog).getByRole("button", { name: /作った日/ }),
  ).toHaveTextContent(expected.replaceAll("-", "/"));

  await user.type(within(dialog).getByLabelText(/ひとことメモ/), "おいしい");
  await user.click(within(dialog).getByRole("button", { name: "記録する" }));

  await waitFor(() =>
    expect(apiFetchMock).toHaveBeenCalledWith("/api/recipes/12/cooking-logs", {
      method: "POST",
      body: { cooked_on: expected, note: "おいしい" },
    }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "作った記録を残す" }),
    ).not.toBeInTheDocument(),
  );
});

it("未来の日付は選べない", async () => {
  vi.useFakeTimers({ now: new Date(2026, 10, 7), shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<CookedButton recipeId={12} />);

  await user.click(screen.getByRole("button", { name: "作った" }));
  await user.click(await screen.findByRole("button", { name: /作った日/ }));

  const day = (label: string) =>
    screen.getByRole("button", { name: label, hidden: true });
  expect(await screen.findByText("11月", { exact: false })).toBeInTheDocument();
  expect(day("7 11月 2026")).not.toBeDisabled();
  expect(day("8 11月 2026")).toBeDisabled();
});

it("サーバーが入力の誤りを返したら、項目の下に出して窓を閉じない", async () => {
  const user = userEvent.setup();
  apiFetchMock.mockRejectedValueOnce(
    new ApiError(422, "入力に誤りがあります", {
      cooked_on: ["作った日に未来の日付は選べません"],
    }),
  );
  render(<CookedButton recipeId={12} />);

  await user.click(screen.getByRole("button", { name: "作った" }));
  await user.click(await screen.findByRole("button", { name: "記録する" }));

  expect(
    await screen.findByText("作った日に未来の日付は選べません"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("dialog", { name: "作った記録を残す" }),
  ).toBeInTheDocument();
});
