import { expect, type Page } from "@playwright/test";

// 持ち主は先に作っておく。CI は ci.yml で作る。手元で動かすときは README を参照
export const OWNER = {
  email: process.env.E2E_OWNER_EMAIL ?? "e2e-owner@example.com",
  password: process.env.E2E_OWNER_PASSWORD ?? "e2e-password-1234",
};

export async function submitLogin(page: Page, email: string, password: string) {
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
}

// Next.js も読み上げ用の空の role="alert" を置くので、文言で絞って探す
export function alertWith(page: Page, text: string) {
  return page.getByRole("alert").filter({ hasText: text });
}

let sequence = 0;

// ブラウザごとに同時に動き、DB にはほかのテストのレシピもあるので、
// 実行ごとに違う言葉を名前に入れて、その言葉で探した結果だけを確かめる
export function uniqueWord(browserName: string): string {
  sequence += 1;
  return `語${browserName}${Date.now()}${sequence}`;
}

// 登録の画面の通しのテストは recipe.spec.ts にあるので、ここは API で作る
export async function createRecipe(
  page: Page,
  name: string,
  overrides: Record<string, unknown> = {},
): Promise<number> {
  const categories = await page.request.get("/api/categories", {
    headers: { Accept: "application/json", Origin: "http://localhost:3000" },
  });
  const { data } = (await categories.json()) as { data: { id: number }[] };
  const cookies = await page.context().cookies();
  const token = cookies.find((cookie) => cookie.name === "XSRF-TOKEN")?.value;

  const response = await page.request.post("/api/recipes", {
    headers: {
      Accept: "application/json",
      Origin: "http://localhost:3000",
      "X-XSRF-TOKEN": decodeURIComponent(token ?? ""),
    },
    data: {
      name,
      category_id: data[0].id,
      servings: 2,
      ingredients: [{ name: "水" }],
      steps: [{ body: "作る" }],
      ...overrides,
    },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { id: number }).id;
}
