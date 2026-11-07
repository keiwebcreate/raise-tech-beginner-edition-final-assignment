// 一覧の検索条件と URL の変換（詳細設計書 5.6）
// URL の名前は API の送る値（A-08）とそろえる

export const RECIPE_SORTS = [
  { value: "newest", label: "新しい順" },
  { value: "name", label: "料理名順" },
  { value: "cook_minutes", label: "調理時間の短い順" },
  { value: "last_cooked", label: "最後に作った日が古い順" },
] as const;

export type RecipeSort = (typeof RECIPE_SORTS)[number]["value"];

export const MAX_MINUTES_OPTIONS = [15, 30, 60] as const;

export type MaxMinutes = (typeof MAX_MINUTES_OPTIONS)[number];

export type RecipeSearch = {
  q: string;
  categoryId: number | null;
  tagId: number | null;
  favorite: boolean;
  maxMinutes: MaxMinutes | null;
  sort: RecipeSort;
  page: number;
};

export type RecipeFilters = Pick<
  RecipeSearch,
  "categoryId" | "tagId" | "favorite" | "maxMinutes"
>;

export const NO_FILTERS: RecipeFilters = {
  categoryId: null,
  tagId: null,
  favorite: false,
  maxMinutes: null,
};

const KEYWORD_MAX_LENGTH = 100;

// サーバーの決まり（RecipeIndexRequest）と同じ
const MAX_PAGE = 1_000_000;

// URL は手で書き換えられるので、決まりに合わない値は「指定なし」として扱う
export function parseRecipeSearch(params: {
  get(name: string): string | null;
}): RecipeSearch {
  return {
    q: normalizeKeyword(params.get("q") ?? ""),
    categoryId: parseId(params.get("category_id")),
    tagId: parseId(params.get("tag_id")),
    favorite: params.get("favorite") === "1",
    maxMinutes:
      MAX_MINUTES_OPTIONS.find(
        (minutes) => String(minutes) === params.get("max_minutes"),
      ) ?? null,
    sort:
      RECIPE_SORTS.find((sort) => sort.value === params.get("sort"))?.value ??
      "newest",
    page: parsePage(params.get("page")),
  };
}

// 初期値は URL に出さない。空なら空文字、あれば「?」から始まる文字を返す
export function toSearchString(search: RecipeSearch): string {
  const params = new URLSearchParams();

  if (search.q !== "") params.set("q", search.q);
  if (search.categoryId !== null) {
    params.set("category_id", String(search.categoryId));
  }
  if (search.tagId !== null) params.set("tag_id", String(search.tagId));
  if (search.favorite) params.set("favorite", "1");
  if (search.maxMinutes !== null) {
    params.set("max_minutes", String(search.maxMinutes));
  }
  if (search.sort !== "newest") params.set("sort", search.sort);
  if (search.page !== 1) params.set("page", String(search.page));

  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}

export function normalizeKeyword(keyword: string): string {
  return keyword.trim().slice(0, KEYWORD_MAX_LENGTH);
}

// スマホの「絞り込み (n)」の n
export function countFilters(filters: RecipeFilters): number {
  return [
    filters.categoryId !== null,
    filters.tagId !== null,
    filters.favorite,
    filters.maxMinutes !== null,
  ].filter(Boolean).length;
}

export function hasConditions(search: RecipeSearch): boolean {
  return search.q !== "" || countFilters(search) > 0;
}

function parseId(value: string | null): number | null {
  return value !== null && /^[1-9]\d{0,14}$/.test(value) ? Number(value) : null;
}

function parsePage(value: string | null): number {
  if (value === null || !/^[1-9]\d*$/.test(value)) {
    return 1;
  }
  const page = Number(value);
  return page <= MAX_PAGE ? page : 1;
}
