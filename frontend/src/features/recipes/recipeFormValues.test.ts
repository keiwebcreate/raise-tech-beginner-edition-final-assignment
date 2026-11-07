import { describe, expect, it } from "vitest";
import {
  initialRecipeFormValues,
  type RecipeFormValues,
  toFormErrors,
  toRecipeFormData,
} from "./recipeFormValues";

function values(overrides: Partial<RecipeFormValues> = {}): RecipeFormValues {
  return { ...initialRecipeFormValues(), ...overrides };
}

describe("toRecipeFormData", () => {
  it("入力した項目を API の形にする", () => {
    const { data } = toRecipeFormData(
      values({
        name: "肉じゃが",
        name_kana: "にくじゃが",
        category_id: "3",
        servings: 4,
        cook_minutes: 30,
        memo: "メモ",
        tags: ["和食", "作り置き"],
        ingredients: [{ key: "a", name: "じゃがいも", quantity: "3個" }],
        steps: [{ key: "b", body: "切る" }],
      }),
    );

    expect(Object.fromEntries(data.entries())).toMatchObject({
      name: "肉じゃが",
      name_kana: "にくじゃが",
      category_id: "3",
      servings: "4",
      cook_minutes: "30",
      memo: "メモ",
      "ingredients[0][name]": "じゃがいも",
      "ingredients[0][quantity]": "3個",
      "steps[0][body]": "切る",
    });
    expect(data.getAll("tags[]")).toEqual(["和食", "作り置き"]);
  });

  it("空の任意の項目は送らない", () => {
    const { data } = toRecipeFormData(values());

    expect([...data.keys()]).toEqual(["servings"]);
  });

  it("空の行は送らず、送った行がフォームの何行目かを覚える", () => {
    const { data, sentRows } = toRecipeFormData(
      values({
        ingredients: [
          { key: "a", name: "  ", quantity: "" },
          { key: "b", name: "塩", quantity: "" },
          { key: "c", name: "", quantity: "" },
          { key: "d", name: "砂糖", quantity: "" },
        ],
        steps: [
          { key: "e", body: "" },
          { key: "f", body: "混ぜる" },
        ],
      }),
    );

    expect(data.get("ingredients[0][name]")).toBe("塩");
    expect(data.get("ingredients[1][name]")).toBe("砂糖");
    expect(data.has("ingredients[0][quantity]")).toBe(false);
    expect(data.get("steps[0][body]")).toBe("混ぜる");
    expect(sentRows).toEqual({ ingredients: [1, 3], steps: [1] });
  });

  it("分量だけ書いた行は、消さずに送る", () => {
    const { data, sentRows } = toRecipeFormData(
      values({ ingredients: [{ key: "a", name: "", quantity: "1個" }] }),
    );

    expect(data.get("ingredients[0][quantity]")).toBe("1個");
    expect(sentRows.ingredients).toEqual([0]);
  });
});

describe("toFormErrors", () => {
  it("サーバーの行番号を、フォームの行番号に戻す", () => {
    expect(
      toFormErrors(
        {
          name: ["料理名を入力してください"],
          ingredients: ["材料を入力してください"],
          "ingredients.1.name": ["材料名は50文字までにしてください"],
          "steps.0.body": ["手順は500文字までにしてください"],
        },
        { ingredients: [0, 3], steps: [2] },
      ),
    ).toEqual({
      name: "料理名を入力してください",
      ingredients: "材料を入力してください",
      "ingredients.3.name": "材料名は50文字までにしてください",
      "steps.2.body": "手順は500文字までにしてください",
    });
  });

  it("タグの誤りは、タグの欄にまとめる", () => {
    expect(
      toFormErrors(
        {
          "tags.1": ["タグは20文字までにしてください"],
          "tags.2": ["タグは20文字までにしてください"],
        },
        { ingredients: [], steps: [] },
      ),
    ).toEqual({ tags: "タグは20文字までにしてください" });
  });
});
