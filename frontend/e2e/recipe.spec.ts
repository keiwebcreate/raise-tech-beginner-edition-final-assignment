import { expect, test } from "@playwright/test";
import { alertWith, OWNER, submitLogin } from "./helpers";

// レシピの登録と詳細の通しのテスト（要件 F-02・F-03・F-32）

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await submitLogin(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL("/");
});

test("登録すると詳細画面に移り、入力した内容が並べ替えた順に表示される", async ({
  page,
  browserName,
}) => {
  // ブラウザごとに同時に動くので、タグの名前を分ける
  const tag = `和食${browserName}${Date.now()}`.slice(0, 20);

  await page.getByRole("link", { name: "＋ レシピを追加" }).click();
  await expect(page).toHaveURL("/recipes/new");

  await page.getByLabel(/料理名/).fill("肉じゃが");
  await page.getByLabel(/よみがな/).fill("にくじゃが");
  await page.getByRole("combobox", { name: /カテゴリ/ }).click();
  await page.getByRole("option", { name: "副菜" }).click();
  await page.getByLabel(/調理時間/).fill("30");
  const tagInput = page.getByRole("combobox", { name: /タグ/ });
  await tagInput.fill(tag);
  await tagInput.press("Enter");

  await page.getByLabel("材料名1").fill("じゃがいも");
  await page.getByLabel("分量1").fill("3個");
  await page.getByRole("button", { name: "＋ 材料を追加" }).click();
  await page.getByLabel("材料名2").fill("塩");

  await page.getByLabel("手順1", { exact: true }).fill("切る");
  await page.getByRole("button", { name: "＋ 手順を追加" }).click();
  await page.getByLabel("手順2", { exact: true }).fill("煮る");

  // キーボードで並び替える：つまみで Space、矢印で動かし、Space で置く
  const handle = page.getByRole("button", { name: "材料1を並び替える" });
  const dragging = page.locator('[data-dragging="true"]');
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(dragging.first()).toBeVisible();
  await page.keyboard.press("ArrowDown");
  // 画面の上で行が動き終わってから置く
  await expect(
    page
      .locator('input[data-path^="ingredients."][data-path$=".name"]')
      .first(),
  ).toHaveValue("塩");
  await page.keyboard.press("Space");
  await expect(dragging).toHaveCount(0);
  await expect(page.getByLabel("材料名1")).toHaveValue("塩");
  await expect(page.getByLabel("材料名2")).toHaveValue("じゃがいも");

  await page.getByRole("button", { name: "保存する" }).click();

  await expect(page).toHaveURL(/\/recipes\/\d+$/);
  await expect(page.getByText("保存しました")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "肉じゃが" }),
  ).toBeVisible();
  await expect(page.getByText("副菜")).toBeVisible();
  await expect(page.getByText(`#${tag}`)).toBeVisible();
  await expect(page.getByText("2人分")).toBeVisible();

  const ingredients = page.getByRole("list").first().getByRole("listitem");
  await expect(ingredients).toHaveText(["塩", "じゃがいも3個"]);
  await expect(page.locator("ol li")).toHaveText(["切る", "煮る"]);

  // 再読み込みしても、サーバーから同じ内容が出る
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "肉じゃが" }),
  ).toBeVisible();
  await expect(ingredients).toHaveText(["塩", "じゃがいも3個"]);
});

test("空のまま保存すると、項目の下とフォームの上に日本語で出る", async ({
  page,
}) => {
  await page.goto("/recipes/new");

  await page.getByRole("button", { name: "保存する" }).click();

  await expect(alertWith(page, "入力に誤りがあります")).toBeVisible();
  await expect(page.getByText("料理名を入力してください")).toBeVisible();
  await expect(page.getByText("カテゴリを選んでください")).toBeVisible();
  await expect(page.getByText("材料を入力してください")).toBeVisible();
  await expect(page.getByText("作り方を入力してください")).toBeVisible();
  await expect(page).toHaveURL("/recipes/new");
});

test("入力を変えてやめると確かめ、捨てると戻る", async ({ page }) => {
  await page.goto("/recipes/new");
  await page.getByLabel(/料理名/).fill("肉じゃが");

  await page.getByRole("button", { name: "やめる" }).click();
  const dialog = page.getByRole("dialog", { name: "変更を捨てますか？" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "入力を続ける" }).click();
  await expect(page.getByLabel(/料理名/)).toHaveValue("肉じゃが");

  await page.getByRole("button", { name: "やめる" }).click();
  await dialog.getByRole("button", { name: "変更を捨てる" }).click();
  await expect(page).toHaveURL("/");
});

for (const path of ["/recipes/999999", "/recipes/abc", "/nothing"]) {
  test(`ない URL は 404 の画面になり、ヘッダーは1つ：${path}`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(
      page.getByRole("heading", { name: "ページが見つかりません" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "レシピ一覧へ" }),
    ).toBeVisible();
    await expect(page.getByRole("banner")).toHaveCount(1);
  });
}

test("レシピを読み込めないときは 500 の画面になり、ヘッダーは1つ", async ({
  page,
}) => {
  await page.route("**/api/recipes/1", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "エラーが起きました" }),
    }),
  );

  await page.goto("/recipes/1");

  await expect(
    page.getByRole("heading", { name: "エラーが起きました" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "再読み込み" })).toBeVisible();
  await expect(page.getByRole("banner")).toHaveCount(1);
});

test("ログインしていないと、登録画面を開いてもログイン画面に移る", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
  });
  const page = await context.newPage();

  await page.goto("/recipes/new");

  await expect(page).toHaveURL("/login?next=%2Frecipes%2Fnew");
  await context.close();
});
