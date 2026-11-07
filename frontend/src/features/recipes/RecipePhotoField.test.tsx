import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/shared/api/client";
import type { Recipe } from "@/shared/api/types";
import { render } from "@/shared/test/render";
import { RecipeEdit } from "./RecipeEdit";
import { RecipeForm } from "./RecipeForm";

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
  name_kana: null,
  category: { id: 1, name: "主菜" },
  servings: 2,
  cook_minutes: null,
  memo: null,
  is_favorite: false,
  photo_url: "https://example.com/large.webp",
  thumb_url: "https://example.com/thumb.webp",
  tags: [],
  ingredients: [{ name: "芋", quantity: null }],
  steps: [{ body: "煮る" }],
  cooking: { count: 0, last_cooked_on: null, recent_logs: [] },
  created_at: "2026-10-01T20:00:00+09:00",
  updated_at: "2026-11-03T21:15:00+09:00",
};

const png = new File(["x"], "dish.png", { type: "image/png" });

beforeEach(() => {
  push.mockClear();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  apiFetchMock.mockReset();
  apiFetchMock.mockImplementation(async (path: string) => {
    if (path === "/api/categories") {
      return { data: [{ id: 1, name: "主菜" }] };
    }
    if (path === "/api/tags") {
      return { data: [] };
    }
    return recipe;
  });
});

function sentFormData(): FormData {
  const call = apiFetchMock.mock.calls.find(
    ([, options]) => options?.method === "POST",
  );
  return call?.[1]?.body as FormData;
}

async function renderEdit() {
  render(<RecipeEdit id={12} copied={false} />);
  await screen.findByLabelText(/料理名/);
  return userEvent.setup();
}

it("登録で写真を選ぶと、プレビューを出して、削除で取り消せる", async () => {
  const user = userEvent.setup({ applyAccept: false });
  render(<RecipeForm />);
  const input = await screen.findByLabelText("完成写真");

  await user.upload(input, png);

  const preview = await screen.findByRole("img", { name: "完成写真" });
  expect(preview).toHaveAttribute("src", "blob:preview");

  await user.click(screen.getByRole("button", { name: "写真を削除" }));

  expect(await screen.findByLabelText("完成写真")).toBeInTheDocument();
  expect(
    screen.queryByRole("img", { name: "完成写真" }),
  ).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
});

it("種類の違うファイルと 5MB を超えるファイルは、理由を出して選ばない", async () => {
  const user = userEvent.setup({ applyAccept: false });
  render(<RecipeForm />);
  const input = await screen.findByLabelText("完成写真");

  await user.upload(input, new File(["x"], "note.txt", { type: "text/plain" }));
  expect(
    await screen.findByText("写真は JPEG・PNG・WebP のどれかにしてください"),
  ).toBeInTheDocument();

  const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
    type: "image/png",
  });
  await user.upload(input, big);
  expect(
    await screen.findByText("写真は5MBまでにしてください"),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("img", { name: "完成写真" }),
  ).not.toBeInTheDocument();
});

it("編集では今の写真を出し、変えなければ写真の項目を送らない", async () => {
  const user = await renderEdit();

  expect(screen.getByRole("img", { name: "完成写真" })).toHaveAttribute(
    "src",
    "https://example.com/large.webp",
  );

  await user.click(screen.getByRole("button", { name: "保存する" }));

  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(sentFormData().has("photo")).toBe(false);
  expect(sentFormData().has("remove_photo")).toBe(false);
});

it("編集で写真を削除すると、消す印を送る", async () => {
  const user = await renderEdit();

  await user.click(screen.getByRole("button", { name: "写真を削除" }));
  expect(await screen.findByLabelText("完成写真")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "保存する" }));

  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(sentFormData().get("remove_photo")).toBe("1");
  expect(sentFormData().has("photo")).toBe(false);
});

it("編集で写真を変えると、新しい写真だけを送り、やめるときは確かめる", async () => {
  const user = await renderEdit();
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error("写真を選ぶ欄がありません");
  }

  await user.upload(input, png);
  await waitFor(() =>
    expect(screen.getByRole("img", { name: "完成写真" })).toHaveAttribute(
      "src",
      "blob:preview",
    ),
  );

  await user.click(screen.getByRole("button", { name: "やめる" }));
  expect(push).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "入力を続ける" }));

  await user.click(screen.getByRole("button", { name: "保存する" }));

  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(sentFormData().get("photo")).toBeInstanceOf(File);
  expect(sentFormData().has("remove_photo")).toBe(false);
});
