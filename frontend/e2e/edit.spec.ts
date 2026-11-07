import { expect, test } from "@playwright/test";
import { createRecipe, OWNER, submitLogin, uniqueWord } from "./helpers";

// レシピの編集・削除・複製の通しのテスト（要件 F-04・F-05・F-06・F-33）

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await submitLogin(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL("/");
});

test("編集すると詳細に反映され、再読み込みしても残る。空にした項目は消える", async ({
  page,
  browserName,
}) => {
  const name = uniqueWord(browserName);
  const id = await createRecipe(page, name, {
    memo: "消すメモ",
    cook_minutes: 30,
    tags: [`${name}タグ`.slice(0, 20)],
    ingredients: [{ name: "じゃがいも", quantity: "3個" }],
    steps: [{ body: "切る" }],
  });

  await page.goto(`/recipes/${id}`);
  await page.getByRole("link", { name: "編集" }).click();
  await expect(page).toHaveURL(`/recipes/${id}/edit`);
  await expect(
    page.getByRole("heading", { level: 1, name: "レシピを編集" }),
  ).toBeVisible();

  // 今の内容が入っている
  await expect(page.getByLabel(/料理名/)).toHaveValue(name);
  await expect(page.getByLabel("材料名1")).toHaveValue("じゃがいも");
  await expect(page.getByLabel("手順1", { exact: true })).toHaveValue("切る");

  await page.getByLabel(/料理名/).fill(`${name}改`);
  await page.getByLabel(/調理時間/).fill("");
  await page.getByLabel("メモ").fill("");
  await page.getByLabel("材料名1").fill("さつまいも");
  await page.getByRole("button", { name: "＋ 手順を追加" }).click();
  await page.getByLabel("手順2", { exact: true }).fill("煮る");
  await page.getByRole("button", { name: "保存する" }).click();

  await expect(page).toHaveURL(`/recipes/${id}`);
  await expect(page.getByText("保存しました")).toBeVisible();

  const checks = async () => {
    await expect(
      page.getByRole("heading", { level: 1, name: `${name}改` }),
    ).toBeVisible();
    await expect(page.getByText("さつまいも")).toBeVisible();
    await expect(page.locator("ol li")).toHaveText(["切る", "煮る"]);
    await expect(page.getByText("消すメモ")).toHaveCount(0);
    await expect(page.getByText("調理時間")).toHaveCount(0);
  };
  await checks();
  await page.reload();
  await checks();
});

test("編集をやめると、変えていなければそのまま、変えていれば確かめてから詳細に戻る", async ({
  page,
  browserName,
}) => {
  const name = uniqueWord(browserName);
  const id = await createRecipe(page, name);

  await page.goto(`/recipes/${id}/edit`);
  await page.getByRole("button", { name: "やめる" }).click();
  await expect(page).toHaveURL(`/recipes/${id}`);

  await page.goto(`/recipes/${id}/edit`);
  await page.getByLabel(/料理名/).fill(`${name}改`);
  await page.getByRole("button", { name: "やめる" }).click();
  await page.getByRole("button", { name: "変更を捨てる" }).click();

  await expect(page).toHaveURL(`/recipes/${id}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
});

test("入力に誤りがあれば、編集画面のまま項目の下に出す", async ({
  page,
  browserName,
}) => {
  const id = await createRecipe(page, uniqueWord(browserName));

  await page.goto(`/recipes/${id}/edit`);
  await page.getByLabel(/料理名/).fill("");
  await page.getByRole("button", { name: "保存する" }).click();

  await expect(page.getByText("料理名を入力してください")).toBeVisible();
  await expect(page).toHaveURL(`/recipes/${id}/edit`);
});

test("複製すると、確かめてからコピーの編集画面を開き、元のレシピは残る", async ({
  page,
  browserName,
}) => {
  const name = uniqueWord(browserName);
  const id = await createRecipe(page, name);
  await page.goto(`/recipes/${id}`);

  await page.getByRole("button", { name: "複製" }).click();
  const dialog = page.getByRole("dialog", {
    name: "このレシピを複製しますか？",
  });
  await expect(dialog).toContainText(`「${name}（コピー）」を作り`);

  await dialog.getByRole("button", { name: "やめる" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(`/recipes/${id}`);

  await page.getByRole("button", { name: "複製" }).click();
  await dialog.getByRole("button", { name: "複製する" }).click();

  await expect(page).toHaveURL(/\/recipes\/\d+\/edit\?copied=1$/);
  expect(page.url()).not.toContain(`/recipes/${id}/`);
  await expect(page.getByText("複製しました")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "レシピを編集（複製したレシピ）",
    }),
  ).toBeVisible();
  await expect(page.getByLabel(/料理名/)).toHaveValue(`${name}（コピー）`);

  // 変えずにやめると、コピーの詳細に戻る
  await page.getByRole("button", { name: "やめる" }).click();
  await expect(page).toHaveURL(/\/recipes\/\d+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: `${name}（コピー）` }),
  ).toBeVisible();

  await page.goto(`/?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(2);
});

test("削除すると、確かめてから一覧に戻り、一覧から消える。詳細の URL は 404 になる", async ({
  page,
  browserName,
}) => {
  const name = uniqueWord(browserName);
  const id = await createRecipe(page, name);
  const listUrl = `/?q=${encodeURIComponent(name)}`;
  await page.goto(listUrl);
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(`/recipes/${id}`);

  await page.getByRole("button", { name: "削除" }).click();
  const dialog = page.getByRole("dialog", { name: "レシピを削除しますか？" });
  await expect(dialog).toContainText(`「${name}」を削除します`);

  await dialog.getByRole("button", { name: "やめる" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(`/recipes/${id}`);

  await page.getByRole("button", { name: "削除" }).click();
  await dialog.getByRole("button", { name: "削除する" }).click();

  // 見ていた条件の一覧に戻る
  await expect(page).toHaveURL(listUrl);
  await expect(page.getByText(`「${name}」を削除しました`)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "条件に合うレシピがありません" }),
  ).toBeVisible();

  // ブラウザの戻るで詳細を開いても、消したレシピは出ない
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "ページが見つかりません" }),
  ).toBeVisible();
});

test("ないレシピの編集画面は 404 の画面になる", async ({ page }) => {
  await page.goto("/recipes/999999/edit");

  await expect(
    page.getByRole("heading", { name: "ページが見つかりません" }),
  ).toBeVisible();
});

test("ログインしていないと、編集画面を開いてもログイン画面に移る", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
  });
  const page = await context.newPage();

  await page.goto("/recipes/1/edit");

  await expect(page).toHaveURL("/login?next=%2Frecipes%2F1%2Fedit");
  await context.close();
});
