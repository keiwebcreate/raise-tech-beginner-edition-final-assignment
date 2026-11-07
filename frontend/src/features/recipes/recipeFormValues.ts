import { randomId } from "@mantine/hooks";
import type { Recipe } from "@/shared/api/types";

// レシピのフォームの値と、送る形への変換

export type IngredientRow = { key: string; name: string; quantity: string };
export type StepRow = { key: string; body: string };

export type RecipeFormValues = {
  name: string;
  name_kana: string;
  category_id: string | null;
  servings: number | string;
  cook_minutes: number | string;
  tags: string[];
  ingredients: IngredientRow[];
  steps: StepRow[];
  memo: string;
  // 新しく選んだ写真
  photo: File | null;
  // 今の写真を消す印
  remove_photo: boolean;
};

export const MAX_ROWS = 50;

// サーバーの決まり（SaveRecipeRequest）と同じ
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

// 送る前に確かめる（大きなファイルを送る時間を無駄にしない）。問題がなければ null
export function photoError(file: File): string | null {
  if (!PHOTO_TYPES.some((type) => type === file.type)) {
    return "写真は JPEG・PNG・WebP のどれかにしてください";
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return "写真は5MBまでにしてください";
  }
  return null;
}

export function newIngredientRow(): IngredientRow {
  return { key: randomId(), name: "", quantity: "" };
}

export function newStepRow(): StepRow {
  return { key: randomId(), body: "" };
}

export function initialRecipeFormValues(): RecipeFormValues {
  return {
    name: "",
    name_kana: "",
    category_id: null,
    servings: 2,
    cook_minutes: "",
    tags: [],
    ingredients: [newIngredientRow()],
    steps: [newStepRow()],
    memo: "",
    photo: null,
    remove_photo: false,
  };
}

// 編集の画面で、今の内容をフォームに入れる
export function recipeToFormValues(recipe: Recipe): RecipeFormValues {
  return {
    name: recipe.name,
    name_kana: recipe.name_kana ?? "",
    category_id: String(recipe.category.id),
    servings: recipe.servings,
    cook_minutes: recipe.cook_minutes ?? "",
    tags: recipe.tags.map((tag) => tag.name),
    ingredients: recipe.ingredients.map((row) => ({
      key: randomId(),
      name: row.name,
      quantity: row.quantity ?? "",
    })),
    steps: recipe.steps.map((row) => ({ key: randomId(), body: row.body })),
    memo: recipe.memo ?? "",
    photo: null,
    remove_photo: false,
  };
}

// 送った行が、フォームの何行目だったか（空の行を除くのでずれる）
export type SentRows = { ingredients: number[]; steps: number[] };

// multipart/form-data の形にする（API 設計書 A-10）。空の行は送らない
export function toRecipeFormData(values: RecipeFormValues): {
  data: FormData;
  sentRows: SentRows;
} {
  const data = new FormData();
  const appendIfFilled = (key: string, value: number | string | null) => {
    if (value !== null && String(value).trim() !== "") {
      data.append(key, String(value));
    }
  };

  appendIfFilled("name", values.name);
  appendIfFilled("name_kana", values.name_kana);
  appendIfFilled("category_id", values.category_id);
  appendIfFilled("servings", values.servings);
  appendIfFilled("cook_minutes", values.cook_minutes);
  appendIfFilled("memo", values.memo);
  for (const tag of values.tags) {
    data.append("tags[]", tag);
  }
  if (values.photo !== null) {
    data.append("photo", values.photo);
  } else if (values.remove_photo) {
    data.append("remove_photo", "1");
  }

  const sentRows: SentRows = { ingredients: [], steps: [] };

  values.ingredients.forEach((row, rowIndex) => {
    // 分量だけ書いた行は消さずに送り、「材料名を入力してください」と知らせる
    if (row.name.trim() === "" && row.quantity.trim() === "") {
      return;
    }
    const index = sentRows.ingredients.length;
    data.append(`ingredients[${index}][name]`, row.name);
    appendIfFilled(`ingredients[${index}][quantity]`, row.quantity);
    sentRows.ingredients.push(rowIndex);
  });

  values.steps.forEach((row, rowIndex) => {
    if (row.body.trim() === "") {
      return;
    }
    data.append(`steps[${sentRows.steps.length}][body]`, row.body);
    sentRows.steps.push(rowIndex);
  });

  return { data, sentRows };
}

// サーバーの入力の誤りを、フォームの項目のエラーにする。行番号はフォームの行に戻す
export function toFormErrors(
  errors: Record<string, string[]>,
  sentRows: SentRows,
): Record<string, string> {
  const formErrors: Record<string, string> = {};

  for (const [key, messages] of Object.entries(errors)) {
    const row = key.match(/^(ingredients|steps)\.(\d+)\.(.+)$/);
    if (row) {
      const list = row[1] as keyof SentRows;
      const rowIndex = sentRows[list][Number(row[2])];
      formErrors[`${list}.${rowIndex}.${row[3]}`] = messages[0];
    } else if (key.startsWith("tags.")) {
      formErrors.tags ??= messages[0];
    } else {
      formErrors[key] = messages[0];
    }
  }

  return formErrors;
}
