import { expect, type Page, test } from "@playwright/test";
import { alertWith, OWNER, submitLogin } from "./helpers";

// パスワード変更の通しのテスト（要件 F-53）。
// ほかのブラウザのログインが切れるので、ほかのテストが終わってから動かす（playwright.config.ts）

const NEW_PASSWORD = "e2e-new-password-5678";

async function changePassword(page: Page, current: string, next: string) {
  await page.goto("/settings");
  await page.getByLabel(/^今のパスワード/).fill(current);
  await page.getByLabel(/^新しいパスワード \*/).fill(next);
  await page.getByLabel(/^新しいパスワード（確認）/).fill(next);
  await page.getByRole("button", { name: "変更する" }).click();
  await expect(page.getByText("パスワードを変更しました")).toBeVisible();
}

test("パスワードを変えると、ほかのブラウザのログインは切れ、新しいパスワードでだけ入れる", async ({
  page,
  browser,
  baseURL,
}) => {
  // ほかのブラウザでもログインしておく
  const otherContext = await browser.newContext({ baseURL });
  const other = await otherContext.newPage();
  await other.goto("/login");
  await submitLogin(other, OWNER.email, OWNER.password);
  await expect(other).toHaveURL("/");

  await page.goto("/login");
  await submitLogin(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL("/");

  await changePassword(page, OWNER.password, NEW_PASSWORD);

  // 今の画面はそのまま使える。入力は空に戻る
  await expect(page.getByLabel(/^今のパスワード/)).toHaveValue("");
  await page.reload();
  await expect(page).toHaveURL("/settings");

  // ほかのブラウザはログイン画面に戻される
  await other.goto("/");
  await expect(other).toHaveURL(/\/login/);
  await otherContext.close();

  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL("/login");

  // 前のパスワードでは入れない
  await submitLogin(page, OWNER.email, OWNER.password);
  await expect(
    alertWith(page, "メールアドレスかパスワードが違います"),
  ).toBeVisible();

  // 新しいパスワードで入れる
  await submitLogin(page, OWNER.email, NEW_PASSWORD);
  await expect(page).toHaveURL("/");

  // 次に動かすときのために元へ戻す
  await changePassword(page, NEW_PASSWORD, OWNER.password);
});
