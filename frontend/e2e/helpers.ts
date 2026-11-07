import type { Page } from "@playwright/test";

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
