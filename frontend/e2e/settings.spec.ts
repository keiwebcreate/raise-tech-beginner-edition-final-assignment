import { expect, test } from "@playwright/test";
import { OWNER, submitLogin } from "./helpers";

// 設定の通しのテスト（要件 F-52・F-53）。パスワードを変えるテストは password.spec.ts

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await submitLogin(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL("/");
});

test("ヘッダーの「設定」から開け、ログイン中のメールアドレスが出る", async ({
  page,
}) => {
  await page.getByRole("link", { name: "設定" }).click();

  await expect(page).toHaveURL("/settings");
  await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();
  await expect(page.getByText(`ログイン中：${OWNER.email}`)).toBeVisible();
});

test("スマホではメニューの中に「設定」があり、横にはみ出さない", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });

  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("link", { name: "設定" }).click();

  await expect(page).toHaveURL("/settings");
  await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("今のパスワードが違うと、その欄の下に日本語で出す", async ({ page }) => {
  await page.goto("/settings");

  await page.getByLabel(/^今のパスワード/).fill("wrong-password");
  await page.getByLabel(/^新しいパスワード \*/).fill("e2e-unused-password");
  await page
    .getByLabel(/^新しいパスワード（確認）/)
    .fill("e2e-unused-password");
  await page.getByRole("button", { name: "変更する" }).click();

  await expect(page.getByText("今のパスワードが違います")).toBeVisible();
});

test("ログアウトするとログイン画面へ移り、戻ろうとしてもログイン画面になる", async ({
  page,
}) => {
  await page.goto("/settings");

  await page.getByRole("button", { name: "ログアウト" }).click();

  await expect(page).toHaveURL("/login");
  await page.goto("/settings");
  await expect(page).toHaveURL("/login?next=%2Fsettings");

  // ログインし直すと、開こうとした設定の画面へ戻る
  await submitLogin(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL("/settings");
});
