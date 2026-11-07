import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Component, type ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/shared/api/client";
import type { Recipe } from "@/shared/api/types";
import { render } from "@/shared/test/render";
import { RecipeDetail } from "./RecipeDetail";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

const push = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  useRouter: () => ({ push }),
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
  servings: 2,
  cook_minutes: 30,
  memo: "<b>砂糖</b>は少なめ",
  is_favorite: false,
  photo_url: null,
  thumb_url: null,
  tags: [{ id: 1, name: "和食" }],
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
  notFound.mockClear();
  push.mockClear();
  apiFetchMock.mockReset();
  sessionStorage.clear();
});

it("レシピの内容を表示する", async () => {
  apiFetchMock.mockResolvedValueOnce(recipe);
  render(<RecipeDetail id={12} />);

  expect(
    await screen.findByRole("heading", { level: 1, name: "肉じゃが" }),
  ).toBeInTheDocument();
  expect(apiFetchMock).toHaveBeenCalledWith("/api/recipes/12", { quiet: true });
  expect(screen.getByText("主菜")).toBeInTheDocument();
  expect(screen.getByText("30")).toBeInTheDocument();
  expect(screen.getByText("#和食")).toBeInTheDocument();
  expect(screen.getByText("2人分")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "写真なし" })).toHaveTextContent(
    "No Image",
  );
  expect(screen.getByRole("link", { name: "一覧に戻る" })).toHaveAttribute(
    "href",
    "/",
  );

  const lists = screen.getAllByRole("list");
  expect(lists[0]).toHaveTextContent("じゃがいも3個");
  expect(lists[0]).toHaveTextContent("塩");
  expect(lists[1].querySelectorAll("li")[1]).toHaveTextContent("煮る");
});

it("写真があれば、写真を出す", async () => {
  apiFetchMock.mockResolvedValueOnce({
    ...recipe,
    photo_url: "https://example.com/large.webp",
  });
  render(<RecipeDetail id={12} />);

  expect(
    await screen.findByRole("img", { name: "肉じゃがの写真" }),
  ).toHaveAttribute("src", "https://example.com/large.webp");
  expect(
    screen.queryByRole("img", { name: "写真なし" }),
  ).not.toBeInTheDocument();
});

it("「一覧に戻る」は、最後に見ていた一覧の条件に戻す", async () => {
  sessionStorage.setItem("recipe-box:list-search", "?q=%E8%B1%9A&page=2");
  apiFetchMock.mockResolvedValueOnce(recipe);

  render(<RecipeDetail id={12} />);

  await screen.findByRole("heading", { level: 1, name: "肉じゃが" });
  expect(screen.getByRole("link", { name: "一覧に戻る" })).toHaveAttribute(
    "href",
    "/?q=%E8%B1%9A&page=2",
  );
});

it("覚えていた値に決まりに合わないものがあれば、取り除く", async () => {
  sessionStorage.setItem("recipe-box:list-search", "?next=//evil.example");
  apiFetchMock.mockResolvedValueOnce(recipe);

  render(<RecipeDetail id={12} />);

  await screen.findByRole("heading", { level: 1, name: "肉じゃが" });
  expect(screen.getByRole("link", { name: "一覧に戻る" })).toHaveAttribute(
    "href",
    "/",
  );
});

it("★ を押すと、先に表示を変えてサーバーへ送る", async () => {
  apiFetchMock.mockResolvedValueOnce(recipe);
  const user = userEvent.setup();
  render(<RecipeDetail id={12} />);

  const star = await screen.findByRole("button", { name: "お気に入り" });
  expect(star).toHaveAttribute("aria-pressed", "false");

  // サーバーの返事を止めておく
  apiFetchMock.mockImplementation(() => new Promise(() => {}));
  await user.click(star);

  await waitFor(() => expect(star).toHaveAttribute("aria-pressed", "true"));
  expect(apiFetchMock).toHaveBeenCalledWith("/api/recipes/12/favorite", {
    method: "PUT",
  });
});

it("★ の保存に失敗したら、表示を戻す", async () => {
  apiFetchMock.mockResolvedValueOnce(recipe);
  const user = userEvent.setup();
  render(<RecipeDetail id={12} />);

  const star = await screen.findByRole("button", { name: "お気に入り" });
  apiFetchMock.mockRejectedValueOnce(new ApiError(500, "エラーが起きました"));
  apiFetchMock.mockResolvedValueOnce(recipe);
  await user.click(star);

  await waitFor(() =>
    expect(apiFetchMock).toHaveBeenCalledWith("/api/recipes/12/favorite", {
      method: "PUT",
    }),
  );
  await waitFor(() => expect(star).toHaveAttribute("aria-pressed", "false"));
});

it("編集のボタンは、編集画面へのリンクになる", async () => {
  apiFetchMock.mockResolvedValueOnce(recipe);
  render(<RecipeDetail id={12} />);

  expect(await screen.findByRole("link", { name: "編集" })).toHaveAttribute(
    "href",
    "/recipes/12/edit",
  );
});

it("複製は確かめてから呼び、コピーの編集画面へ移る", async () => {
  apiFetchMock.mockResolvedValueOnce(recipe);
  const user = userEvent.setup();
  render(<RecipeDetail id={12} />);

  await user.click(await screen.findByRole("button", { name: "複製" }));
  expect(apiFetchMock).toHaveBeenCalledTimes(1);

  apiFetchMock.mockResolvedValueOnce({ ...recipe, id: 13 });
  await user.click(screen.getByRole("button", { name: "複製する" }));

  await waitFor(() =>
    expect(push).toHaveBeenCalledWith("/recipes/13/edit?copied=1"),
  );
  expect(apiFetchMock).toHaveBeenCalledWith("/api/recipes/12/copy", {
    method: "POST",
  });
});

it("削除は確かめてから呼び、最後に見ていた一覧へ移る", async () => {
  sessionStorage.setItem("recipe-box:list-search", "?page=2");
  apiFetchMock.mockResolvedValueOnce(recipe);
  const user = userEvent.setup();
  render(<RecipeDetail id={12} />);

  await user.click(await screen.findByRole("button", { name: "削除" }));
  expect(apiFetchMock).toHaveBeenCalledTimes(1);

  apiFetchMock.mockResolvedValueOnce(undefined);
  await user.click(screen.getByRole("button", { name: "削除する" }));

  await waitFor(() => expect(push).toHaveBeenCalledWith("/?page=2"));
  expect(apiFetchMock).toHaveBeenCalledWith("/api/recipes/12", {
    method: "DELETE",
  });
});

it("削除に失敗したら、一覧へ移らない", async () => {
  apiFetchMock.mockResolvedValueOnce(recipe);
  const user = userEvent.setup();
  render(<RecipeDetail id={12} />);

  await user.click(await screen.findByRole("button", { name: "削除" }));
  apiFetchMock.mockRejectedValueOnce(new ApiError(500, "エラーが起きました"));
  await user.click(screen.getByRole("button", { name: "削除する" }));

  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "削除する" }),
    ).not.toHaveAttribute("data-loading"),
  );
  expect(push).not.toHaveBeenCalled();
});

it("メモは文字のまま出す（HTML として動かさない）", async () => {
  apiFetchMock.mockResolvedValueOnce(recipe);
  render(<RecipeDetail id={12} />);

  expect(await screen.findByText("<b>砂糖</b>は少なめ")).toBeInTheDocument();
});

it("メモがなければ欄を出さず、作った記録は「まだありません」と出す", async () => {
  apiFetchMock.mockResolvedValueOnce({ ...recipe, memo: null });
  render(<RecipeDetail id={12} />);

  expect(await screen.findByText("まだありません")).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "メモ" }),
  ).not.toBeInTheDocument();
});

it("作った記録があれば、回数・最後に作った日・記録を出す", async () => {
  apiFetchMock.mockResolvedValueOnce({
    ...recipe,
    cooking: {
      count: 5,
      last_cooked_on: "2026-11-03",
      recent_logs: [{ id: 1, cooked_on: "2026-11-03", note: "おいしい" }],
    },
  });
  render(<RecipeDetail id={12} />);

  expect(await screen.findByText("5")).toBeInTheDocument();
  expect(screen.getByText("11/3")).toBeInTheDocument();
  expect(screen.getByText("2026/11/03")).toBeInTheDocument();
  expect(screen.getByText("おいしい")).toBeInTheDocument();
});

it("見つからなければ 404 の画面にする", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  apiFetchMock.mockRejectedValueOnce(new ApiError(404, "見つかりません"));

  render(
    <CatchError>
      <RecipeDetail id={999} />
    </CatchError>,
  );

  expect(await screen.findByText("NEXT_NOT_FOUND")).toBeInTheDocument();
  expect(notFound).toHaveBeenCalled();
});

it("そのほかのエラーは、エラーの画面に任せる", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  apiFetchMock.mockRejectedValueOnce(new ApiError(500, "エラーが起きました"));

  render(
    <CatchError>
      <RecipeDetail id={12} />
    </CatchError>,
  );

  expect(await screen.findByText("エラーが起きました")).toBeInTheDocument();
  expect(notFound).not.toHaveBeenCalled();
});

// 画面が投げたエラーを受け止める（本番では not-found.tsx・error.tsx の役目）
class CatchError extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    return this.state.message ?? this.props.children;
  }
}
