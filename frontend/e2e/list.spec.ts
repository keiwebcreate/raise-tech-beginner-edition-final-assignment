import { expect, type Page, test } from "@playwright/test";
import { createRecipe, OWNER, submitLogin, uniqueWord } from "./helpers";

// レシピ一覧の通しのテスト（要件 F-01・F-07・F-11〜17）

function tileLink(page: Page, name: string) {
  return page.getByRole("link", { name: new RegExp(name) });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await submitLogin(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL("/");
});

test("画面から登録したレシピが一覧に出て、押すと詳細に移る", async ({
  page,
  browserName,
}) => {
  const name = uniqueWord(browserName);

  await page.getByRole("link", { name: "＋ レシピを追加" }).click();
  await expect(page).toHaveURL("/recipes/new");
  await page.getByLabel(/料理名/).fill(name);
  await page.getByRole("combobox", { name: /カテゴリ/ }).click();
  await page.getByRole("option", { name: "副菜" }).click();
  await page.getByLabel("材料名1").fill("じゃがいも");
  await page.getByLabel("手順1", { exact: true }).fill("切る");
  await page.getByRole("button", { name: "保存する" }).click();
  await expect(page).toHaveURL(/\/recipes\/\d+$/);

  await page.getByRole("link", { name: "一覧に戻る" }).click();
  await expect(page).toHaveURL("/");

  // 新しい順なので1ページ目に出る（同時に動くほかのテストのレシピと並ぶので、順番までは見ない）
  await tileLink(page, name).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
});

test("キーワードは入力が止まると検索し、URL に入る。ひらがなでカタカナも探せる", async ({
  page,
  browserName,
}) => {
  const word = uniqueWord(browserName);
  await createRecipe(page, `${word}トマト煮`);
  await createRecipe(page, `${word}サラダ`);

  const keyword = page.getByRole("searchbox", { name: "料理名や材料で探す" });
  await keyword.fill(`${word}とまと`);

  await expect(page).toHaveURL(`/?q=${encodeURIComponent(`${word}とまと`)}`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    `${word}トマト煮`,
  ]);
  await expect(page.getByRole("status")).toContainText("1件中 1〜1件");

  // 再読み込みしても条件が残る
  await page.reload();
  await expect(keyword).toHaveValue(`${word}とまと`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    `${word}トマト煮`,
  ]);
});

test("絞り込みと並び替えを組み合わせ、クリアすると戻り、ブラウザの戻るでも戻る", async ({
  page,
  browserName,
}) => {
  const word = uniqueWord(browserName);
  await createRecipe(page, `${word}長い`, { cook_minutes: 45 });
  await createRecipe(page, `${word}短い`, { cook_minutes: 10 });

  await page.goto(`/?q=${encodeURIComponent(word)}`);
  const headings = page.getByRole("heading", { level: 2 });
  await expect(headings).toHaveText([`${word}短い`, `${word}長い`]);

  await page.getByRole("combobox", { name: "調理時間" }).selectOption("15");
  await expect(page).toHaveURL(/max_minutes=15/);
  await expect(headings).toHaveText([`${word}短い`]);

  await page.goBack();
  await expect(page).not.toHaveURL(/max_minutes/);
  await expect(page.getByRole("combobox", { name: "調理時間" })).toHaveValue(
    "",
  );
  await expect(headings).toHaveText([`${word}短い`, `${word}長い`]);

  await page
    .getByRole("combobox", { name: "並び替え" })
    .selectOption("cook_minutes");
  await expect(page).toHaveURL(/sort=cook_minutes/);
  await expect(headings).toHaveText([`${word}短い`, `${word}長い`]);

  await page.getByRole("button", { name: "条件をクリア" }).click();
  // 並び替えは絞り込みの条件ではないので残る
  await expect(page).toHaveURL("/?sort=cook_minutes");
  await expect(
    page.getByRole("searchbox", { name: "料理名や材料で探す" }),
  ).toHaveValue("");
});

test("★ は押すとすぐ変わり、再読み込みしても残り、詳細にも出る。失敗したら戻す", async ({
  page,
  browserName,
}) => {
  const name = uniqueWord(browserName);
  const id = await createRecipe(page, name);
  await page.goto(`/?q=${encodeURIComponent(name)}`);

  const star = page.getByRole("button", {
    name: `${name}をお気に入りにする`,
  });
  await expect(star).toHaveAttribute("aria-pressed", "false");

  const saved = page.waitForResponse(`**/api/recipes/${id}/favorite`);
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "true");
  await saved;

  await page.reload();
  await expect(star).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /お気に入りだけ/ }).click();
  await expect(page).toHaveURL(/favorite=1/);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([name]);

  await tileLink(page, name).click();
  await expect(page).toHaveURL(`/recipes/${id}`);
  const detailStar = page.getByRole("button", {
    name: "お気に入り",
    exact: true,
  });
  await expect(detailStar).toHaveAttribute("aria-pressed", "true");

  // サーバーが失敗したら、元の表示に戻して知らせる
  await page.route(`**/api/recipes/${id}/favorite`, (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "エラーが起きました" }),
    }),
  );
  await detailStar.click();
  await expect(page.getByText("エラーが起きました")).toBeVisible();
  await expect(detailStar).toHaveAttribute("aria-pressed", "true");
});

test("詳細の「一覧に戻る」とブラウザの戻るで、同じ条件の一覧に戻る", async ({
  page,
  browserName,
}) => {
  const name = uniqueWord(browserName);
  await createRecipe(page, name);
  const listUrl = `/?q=${encodeURIComponent(name)}&sort=name`;
  await page.goto(listUrl);

  await tileLink(page, name).click();
  await expect(page).toHaveURL(/\/recipes\/\d+$/);
  await page.getByRole("link", { name: "一覧に戻る" }).click();
  await expect(page).toHaveURL(listUrl);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([name]);

  await tileLink(page, name).click();
  await expect(page).toHaveURL(/\/recipes\/\d+$/);
  await page.goBack();
  await expect(page).toHaveURL(listUrl);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([name]);
});

test("タイルとリストを切り替え、選んだ形を覚える", async ({
  page,
  browserName,
}) => {
  const name = uniqueWord(browserName);
  await createRecipe(page, name);
  await page.goto(`/?q=${encodeURIComponent(name)}`);

  const list = page.getByRole("button", { name: "リスト表示" });
  await list.click();
  await expect(list).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(list).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([name]);
});

test("20件を超えると、条件を保ったままページを移れる。ないページは最後のページへ移す", async ({
  page,
  browserName,
}) => {
  const word = uniqueWord(browserName);
  for (let index = 0; index < 21; index += 1) {
    await createRecipe(page, `${word}番${index}`);
  }
  await page.goto(`/?q=${encodeURIComponent(word)}`);
  await expect(page.getByRole("status")).toContainText("21件中 1〜20件");

  await page.getByRole("button", { name: "次のページ" }).click();

  await expect(page).toHaveURL(/q=.*&page=2/);
  await expect(page.getByRole("status")).toContainText("21件中 21〜21件");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    `${word}番0`,
  ]);

  await page.goto(`/?q=${encodeURIComponent(word)}&page=9`);
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    `${word}番0`,
  ]);
});

test("条件に合わないと案内を出し、クリアできる", async ({
  page,
  browserName,
}) => {
  const word = uniqueWord(browserName);
  await page.goto(`/?q=${encodeURIComponent(word)}`);

  await expect(
    page.getByRole("heading", { name: "条件に合うレシピがありません" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("0件");

  await page
    .getByRole("main")
    .getByRole("button", { name: "条件をクリア" })
    .last()
    .click();
  await expect(page).toHaveURL("/");
});

test("URL の決まりに合わない条件は無視する", async ({ page }) => {
  await page.goto("/?sort=abc&max_minutes=20&page=-1&category_id=x");

  await expect(page.getByRole("combobox", { name: "並び替え" })).toHaveValue(
    "newest",
  );
  await expect(
    page.getByRole("heading", { name: "エラーが起きました" }),
  ).toHaveCount(0);
});

test("スマホでは、絞り込みを下から出る窓で選ぶ。320px でも横にはみ出さない", async ({
  page,
  browserName,
}) => {
  const word = uniqueWord(browserName);
  await createRecipe(page, `${word}長い`, { cook_minutes: 45 });
  await createRecipe(page, `${word}短い`, { cook_minutes: 10 });
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`/?q=${encodeURIComponent(word)}`);

  await expect(page.getByRole("combobox", { name: "調理時間" })).toHaveCount(0);

  await page.getByRole("button", { name: "絞り込み (0)" }).click();
  const drawer = page.getByRole("dialog", { name: "絞り込み" });
  await drawer.getByLabel("調理時間").selectOption("15");
  await drawer.getByRole("button", { name: "この条件で表示" }).click();

  await expect(drawer).toBeHidden();
  await expect(
    page.getByRole("button", { name: "絞り込み (1)" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    `${word}短い`,
  ]);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
