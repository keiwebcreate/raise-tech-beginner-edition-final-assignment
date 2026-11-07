import { randomId } from "@mantine/hooks";

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
};

export const MAX_ROWS = 50;

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
