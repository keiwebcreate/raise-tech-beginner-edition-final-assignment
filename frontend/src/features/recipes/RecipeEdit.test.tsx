import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/shared/api/client";
import type { Recipe } from "@/shared/api/types";
import { render } from "@/shared/test/render";
import { RecipeEdit } from "./RecipeEdit";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: () => ({ push }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/client")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

const recipe: Recipe = {
  id: 12,
  name: "肉じゃが",
  name_kana: "にくじゃが",
  category: { id: 1, name: "主菜" },
  servings: 3,
  cook_minutes: 30,
  memo: "砂糖は少なめ",
  is_favorite: false,
  photo_url: null,
  thumb_url: null,
  tags: [{ id: 5, name: "和食" }],
  ingredients: [
    { name: "じゃがいも", quantity: "3個" },
    { name: "塩", quantity: null },
  ],
  steps: [{ body: "切る" }, { body: "煮る" }],
  cooking: { count: 0, last_cooked_on: null, recent_logs: [] },
  created_at: "2026-10-01T20:00:00+09:00",
  updated_at: "2026-11-03T21:15:00+09:00",
};

beforeEach(() => {
  push.mockClear();
  apiFetchMock.mockReset();
  apiFetchMock.mockImplementation(async (path: string, options) => {
    if (path === "/api/categories") {
      return { data: [{ id: 1, name: "主菜" }] };
    }
    if (path === "/api/tags") {
      return { data: [{ id: 5, name: "和食", recipes_count: 1 }] };
    }
    return options?.method === "POST" ? { ...recipe, name: "豚汁" } : recipe;
  });
});

function savedFormData(): FormData {
  const call = apiFetchMock.mock.calls.find(
    ([, options]) => options?.method === "POST",
  );
  return call?.[1]?.body as FormData;
}

it("今の内容をフォームに入れて開く", async () => {
  render(<RecipeEdit id={12} copied={false} />);

  expect(await screen.findByLabelText(/料理名/)).toHaveValue("肉じゃが");
  expect(
    screen.getByRole("heading", { level: 1, name: "レシピを編集" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/よみがな/)).toHaveValue("にくじゃが");
  expect(screen.getByLabelText(/何人分/)).toHaveValue("3");
  expect(screen.getByLabelText(/調理時間/)).toHaveValue("30");
  expect(screen.getByLabelText("材料名1")).toHaveValue("じゃがいも");
  expect(screen.getByLabelText("分量1")).toHaveValue("3個");
  expect(screen.getByLabelText("材料名2")).toHaveValue("塩");
  expect(screen.getByLabelText("手順2")).toHaveValue("煮る");
  expect(screen.getByLabelText("メモ")).toHaveValue("砂糖は少なめ");
});

it("複製したレシピのときは、見出しで知らせる", async () => {
  render(<RecipeEdit id={12} copied />);

  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "レシピを編集（複製したレシピ）",
    }),
  ).toBeInTheDocument();
});

it("POST に _method=PUT を付けて送り、詳細へ移る", async () => {
  const user = userEvent.setup();
  render(<RecipeEdit id={12} copied={false} />);

  const name = await screen.findByLabelText(/料理名/);
  await user.clear(name);
  await user.type(name, "豚汁");
  await user.click(screen.getByRole("button", { name: "保存する" }));

  await waitFor(() => expect(push).toHaveBeenCalledWith("/recipes/12"));
  expect(apiFetchMock).toHaveBeenCalledWith(
    "/api/recipes/12",
    expect.objectContaining({ method: "POST" }),
  );
  const data = savedFormData();
  expect(data.get("_method")).toBe("PUT");
  expect(data.get("name")).toBe("豚汁");
  expect(data.get("ingredients[1][name]")).toBe("塩");
});

it("変えずにやめると、確かめずに詳細へ戻る", async () => {
  const user = userEvent.setup();
  render(<RecipeEdit id={12} copied={false} />);

  await screen.findByLabelText(/料理名/);
  await user.click(screen.getByRole("button", { name: "やめる" }));

  expect(push).toHaveBeenCalledWith("/recipes/12");
  expect(
    screen.queryByRole("dialog", { name: "変更を捨てますか？" }),
  ).not.toBeInTheDocument();
});

it("変えてやめると、確かめてから詳細へ戻る", async () => {
  const user = userEvent.setup();
  render(<RecipeEdit id={12} copied={false} />);

  await user.type(await screen.findByLabelText(/料理名/), "改");
  await user.click(screen.getByRole("button", { name: "やめる" }));
  expect(push).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "変更を捨てる" }));
  expect(push).toHaveBeenCalledWith("/recipes/12");
});
