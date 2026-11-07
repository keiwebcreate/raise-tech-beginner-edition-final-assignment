import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Component, type ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/shared/api/client";
import type { Paginated, RecipeListItem } from "@/shared/api/types";
import { render } from "@/shared/test/render";
import { RecipeList } from "./RecipeList";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/client")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

const item: RecipeListItem = {
  id: 12,
  name: "肉じゃが",
  category: { id: 1, name: "主菜" },
  cook_minutes: 30,
  tags: [{ id: 5, name: "和食" }],
  is_favorite: true,
  thumb_url: null,
  last_cooked_on: null,
};

function page(
  data: RecipeListItem[],
  meta: Partial<Paginated<RecipeListItem>["meta"]> = {},
): Paginated<RecipeListItem> {
  return {
    data,
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 20,
      total: data.length,
      from: data.length ? 1 : null,
      to: data.length ? data.length : null,
      ...meta,
    },
  };
}

function respondWith(list: Paginated<RecipeListItem> | Error) {
  apiFetchMock.mockImplementation(async (path) => {
    if (path === "/api/categories") {
      return { data: [{ id: 1, name: "主菜" }] };
    }
    if (path === "/api/tags") {
      return { data: [{ id: 5, name: "和食" }] };
    }
    if (list instanceof Error) {
      throw list;
    }
    return list;
  });
}

beforeEach(() => {
  apiFetchMock.mockReset();
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
  window.sessionStorage.clear();
});

it("レシピを並べ、件数を出し、★ の状態を伝える", async () => {
  respondWith(page([item], { total: 24, from: 1, to: 20, last_page: 2 }));

  render(<RecipeList />);

  expect(
    await screen.findByRole("heading", { level: 2, name: "肉じゃが" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("24件中 1〜20件");
  expect(screen.getByRole("link", { name: /肉じゃが/ })).toHaveAttribute(
    "href",
    "/recipes/12",
  );
  expect(screen.getByText("#和食")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "肉じゃがをお気に入りにする" }),
  ).toHaveAttribute("aria-pressed", "true");
});

it("タグが3つまでなら全部出し、数は出さない", async () => {
  const tags = ["和食", "時短", "作り置き"].map((name, id) => ({ id, name }));
  respondWith(page([{ ...item, tags }]));

  render(<RecipeList />);

  expect(await screen.findByText("#作り置き")).toBeInTheDocument();
  expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
});

it("タグが4つ以上なら3つと残りの数を出し、マウスを乗せると全部出る", async () => {
  const names = ["和食", "時短", "作り置き", "お弁当", "節約"];
  const tags = names.map((name, id) => ({ id, name }));
  respondWith(page([{ ...item, tags }]));

  render(<RecipeList />);

  expect(await screen.findByText("#作り置き")).toBeInTheDocument();
  expect(screen.queryByText("#お弁当")).not.toBeInTheDocument();
  const hidden = screen.getByText("+2");
  expect(hidden.parentElement).toHaveAttribute(
    "title",
    "#和食 #時短 #作り置き #お弁当 #節約",
  );
});

it("レシピが1件もないときは、最初の1件を案内する", async () => {
  respondWith(page([]));

  render(<RecipeList />);

  expect(
    await screen.findByRole("heading", {
      name: "最初のレシピを追加しましょう",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "レシピを追加する" }),
  ).toHaveAttribute("href", "/recipes/new");
});

it("条件を付けて0件のときは、条件の案内と登録へのリンクを出す", async () => {
  window.history.replaceState(null, "", "/?q=なし");
  respondWith(page([]));

  render(<RecipeList />);

  expect(
    await screen.findByRole("heading", {
      name: "条件に合うレシピがありません",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "レシピを追加する" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("「なし」");
});

it("URL の条件で API を呼ぶ", async () => {
  window.history.replaceState(null, "", "/?category_id=1&page=2&sort=abc");
  respondWith(page([item], { current_page: 2, last_page: 2 }));

  render(<RecipeList />);

  await screen.findByRole("heading", { level: 2, name: "肉じゃが" });
  expect(apiFetchMock).toHaveBeenCalledWith(
    "/api/recipes?category_id=1&page=2",
    { quiet: true },
  );
});

it("キーワードは入力が止まってから URL に入れ、ページを1に戻す", async () => {
  window.history.replaceState(null, "", "/?page=2");
  respondWith(page([item], { current_page: 2, last_page: 2 }));
  const user = userEvent.setup();

  render(<RecipeList />);
  await user.type(
    screen.getByRole("searchbox", { name: "料理名や材料で探す" }),
    "豚肉",
  );

  // 打ち終わった直後は、まだ変わらない
  expect(window.location.search).toBe("?page=2");
  await waitFor(() =>
    expect(window.location.search).toBe(`?q=${encodeURIComponent("豚肉")}`),
  );
});

it("日本語の変換中は検索せず、確定してから検索する", async () => {
  respondWith(page([item]));
  const user = userEvent.setup();

  render(<RecipeList />);
  const input = screen.getByRole("searchbox", { name: "料理名や材料で探す" });
  input.focus();
  input.dispatchEvent(
    new CompositionEvent("compositionstart", { bubbles: true }),
  );
  await user.keyboard("ぶた");
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect(window.location.search).toBe("");

  input.dispatchEvent(
    new CompositionEvent("compositionend", { bubbles: true }),
  );
  await waitFor(() =>
    expect(window.location.search).toBe(`?q=${encodeURIComponent("ぶた")}`),
  );
});

it("読み込めないときは、エラーの画面に任せる", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  respondWith(new ApiError(500, "エラーが起きました"));

  render(
    <CatchError>
      <RecipeList />
    </CatchError>,
  );

  expect(await screen.findByText("エラーが起きました")).toBeInTheDocument();
});

// 画面が投げたエラーを受け止める（本番では error.tsx の役目）
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
