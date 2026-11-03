import { expect, test } from "@playwright/test";

// 環境構築の確認用。機能の通しのテストができたら置き換える
test("トップの画面が開ける", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Recipe Box" })).toBeVisible();
});

test("/api は Laravel に転送され、ログインなしでは 401 になる", async ({
  request,
}) => {
  const response = await request.get("/api/me", {
    headers: { Accept: "application/json" },
  });
  expect(response.status()).toBe(401);
});
