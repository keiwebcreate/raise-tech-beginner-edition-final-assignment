import { describe, expect, it } from "vitest";
import {
  countFilters,
  hasConditions,
  NO_FILTERS,
  parseRecipeSearch,
  type RecipeSearch,
  toSearchString,
} from "./recipeSearch";

const DEFAULTS: RecipeSearch = {
  ...NO_FILTERS,
  q: "",
  sort: "newest",
  page: 1,
};

function parse(text: string) {
  return parseRecipeSearch(new URLSearchParams(text));
}

describe("parseRecipeSearch", () => {
  it("何もなければ初期値", () => {
    expect(parse("")).toEqual(DEFAULTS);
  });

  it("URL の条件を読む", () => {
    expect(
      parse(
        "q=豚肉&category_id=1&tag_id=2&favorite=1&max_minutes=30&sort=name&page=3",
      ),
    ).toEqual({
      q: "豚肉",
      categoryId: 1,
      tagId: 2,
      favorite: true,
      maxMinutes: 30,
      sort: "name",
      page: 3,
    });
  });

  it.each([
    "category_id=abc",
    "category_id=0",
    "category_id=-1",
    "category_id=1e3",
    "category_id=99999999999999999999",
    "tag_id=1.5",
    "favorite=0",
    "favorite=true",
    "max_minutes=20",
    "sort=abc",
    "page=0",
    "page=-1",
    "page=abc",
    "page=1000001",
    "q=%20%E3%80%80",
  ])("決まりに合わない値は指定なしにする：%s", (text) => {
    expect(parse(text)).toEqual(DEFAULTS);
  });

  it("キーワードは前後の空白を取り、100文字までにする", () => {
    expect(parse("q=%E3%80%80豚肉 ").q).toBe("豚肉");
    expect(parse(`q=${"あ".repeat(101)}`).q).toBe("あ".repeat(100));
  });
});

describe("toSearchString", () => {
  it("初期値だけなら空文字", () => {
    expect(toSearchString(DEFAULTS)).toBe("");
  });

  it("初期値でないものだけを出す", () => {
    expect(toSearchString({ ...DEFAULTS, sort: "name", page: 2 })).toBe(
      "?sort=name&page=2",
    );
  });

  it("記号や日本語を URL に使える形にする", () => {
    const text = toSearchString({ ...DEFAULTS, q: "a&b=豚 #1" });

    expect(parse(text.slice(1)).q).toBe("a&b=豚 #1");
    expect(text).not.toContain("&b=");
  });

  it("変換して読み直すと同じ条件に戻る", () => {
    const search: RecipeSearch = {
      q: "豚肉",
      categoryId: 1,
      tagId: 2,
      favorite: true,
      maxMinutes: 15,
      sort: "last_cooked",
      page: 4,
    };

    expect(parse(toSearchString(search).slice(1))).toEqual(search);
  });
});

describe("条件の数", () => {
  it("キーワードと並び替えは絞り込みの数に入れない", () => {
    expect(
      countFilters({ ...DEFAULTS, q: "豚肉", sort: "name" } as RecipeSearch),
    ).toBe(0);
    expect(
      countFilters({
        categoryId: 1,
        tagId: 2,
        favorite: true,
        maxMinutes: 15,
      }),
    ).toBe(4);
  });

  it("キーワードか絞り込みがあれば、条件ありとする。並び替えとページは条件ではない", () => {
    expect(hasConditions({ ...DEFAULTS, sort: "name", page: 2 })).toBe(false);
    expect(hasConditions({ ...DEFAULTS, q: "豚肉" })).toBe(true);
    expect(hasConditions({ ...DEFAULTS, favorite: true })).toBe(true);
  });
});
