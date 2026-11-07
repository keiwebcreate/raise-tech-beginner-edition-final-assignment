import { expect, type Page, test } from "@playwright/test";

// ログインの通しのテスト（要件 F-51・F-61・F-62・N-25）。
// 持ち主は先に作っておく。CI は ci.yml で作る。手元で動かすときは README を参照
const OWNER = {
  email: process.env.E2E_OWNER_EMAIL ?? "e2e-owner@example.com",
  password: process.env.E2E_OWNER_PASSWORD ?? "e2e-password-1234",
};

async function submitLogin(page: Page, email: string, password: string) {
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
}

// Next.js も読み上げ用の空の role="alert" を置くので、文言で絞って探す
function alertWith(page: Page, text: string) {
  return page.getByRole("alert").filter({ hasText: text });
}

test("ログインしていないと、ログイン画面に移り、開こうとした画面の URL を覚える", async ({
  page,
}) => {
  await page.goto("/?q=test");

  await expect(page).toHaveURL("/login?next=%2F%3Fq%3Dtest");
  await expect(page.getByRole("heading", { name: "Recipe Box" })).toBeVisible();
  await expect(page.getByLabel("ログイン状態を保持する")).toBeChecked();
});

test("ログインすると、開こうとした画面に戻る", async ({ page }) => {
  await page.goto("/?q=test");

  await submitLogin(page, OWNER.email, OWNER.password);

  await expect(page).toHaveURL("/?q=test");
});

test("ログイン中は再読み込みしてもログインしたままで、ログイン画面を開くと一覧へ移る", async ({
  page,
}) => {
  await page.goto("/login");
  await submitLogin(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL("/");

  await page.reload();
  await expect(page).toHaveURL("/");

  await page.goto("/login");
  await expect(page).toHaveURL("/");
});

test("間違っていたら、どちらが違うかを教えず、ログイン画面のまま", async ({
  page,
  browserName,
}) => {
  // 回数制限にかからないよう、毎回違うメールアドレスにする
  const email = `wrong-${browserName}-${Date.now()}@example.com`;
  await page.goto("/login");

  await submitLogin(page, email, "wrong-password");

  await expect(
    alertWith(page, "メールアドレスかパスワードが違います"),
  ).toBeVisible();
  await expect(page).toHaveURL("/login");
});

test("空のまま送ると、項目のすぐ下に日本語で出す", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(alertWith(page, "入力に誤りがあります")).toBeVisible();
  await expect(
    page.getByText("メールアドレスを入力してください"),
  ).toBeVisible();
  await expect(page.getByText("パスワードを入力してください")).toBeVisible();
});

for (const next of ["https://evil.example/", "/.//evil.example"]) {
  test(`戻り先に外のサイトを指定されても、外へ移らない：${next}`, async ({
    page,
  }) => {
    await page.goto(`/login?next=${encodeURIComponent(next)}`);

    await submitLogin(page, OWNER.email, OWNER.password);

    await expect(page).toHaveURL("/");
  });
}

test("ログインしていないと、API は 401 を返す", async ({ request }) => {
  const response = await request.get("/api/me", {
    headers: { Accept: "application/json" },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ message: "ログインしてください" });
});

test("合言葉（CSRF）なしのログインは 419 で断る", async ({
  request,
  baseURL,
}) => {
  const response = await request.post("/api/login", {
    headers: { Accept: "application/json", Referer: `${baseURL}/login` },
    data: { email: OWNER.email, password: OWNER.password },
  });

  expect(response.status()).toBe(419);
});
