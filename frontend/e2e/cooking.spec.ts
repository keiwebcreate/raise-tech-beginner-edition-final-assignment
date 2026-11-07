import { expect, type Page, test } from "@playwright/test";
import { createRecipe, OWNER, submitLogin, uniqueWord } from "./helpers";

// 作った記録の通しのテスト（要件 F-41〜F-43）

// 過去の日付の記録は、API で作る（カレンダーの操作は月またぎで不安定になるため）
async function addLog(page: Page, recipeId: number, cookedOn: string) {
  const cookies = await page.context().cookies();
  const token = cookies.find((cookie) => cookie.name === "XSRF-TOKEN")?.value;
  const response = await page.request.post(
    `/api/recipes/${recipeId}/cooking-logs`,
    {
      headers: {
        Accept: "application/json",
        Origin: "http://localhost:3000",
        "X-XSRF-TOKEN": decodeURIComponent(token ?? ""),
      },
      data: { cooked_on: cookedOn, note: `${cookedOn}の記録` },
    },
  );
  expect(response.status()).toBe(201);
}

function todayText(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}/${month}/${day}`;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await submitLogin(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL("/");
});

test("作ったを押して記録すると、回数と最後に作った日が変わり、消すと戻る", async ({
  page,
  browserName,
}) => {
  const id = await createRecipe(page, uniqueWord(browserName));
  await page.goto(`/recipes/${id}`);
  await expect(page.getByText("まだありません")).toBeVisible();

  await page.getByRole("button", { name: "作った", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "作った記録を残す" });
  await expect(dialog.getByRole("button", { name: /作った日/ })).toContainText(
    todayText(),
  );
  await dialog
    .getByLabel(/ひとことメモ/)
    .fill("塩を減らしたらちょうどよかった");
  await dialog.getByRole("button", { name: "記録する" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("記録しました")).toBeVisible();
  await expect(page.getByText("まだありません")).toHaveCount(0);
  await expect(page.getByText("塩を減らしたらちょうどよかった")).toBeVisible();
  await expect(page.getByText("最後に作った日")).toBeVisible();

  // 再読み込みしても残る
  await page.reload();
  await expect(page.getByText("塩を減らしたらちょうどよかった")).toBeVisible();

  await page
    .getByRole("button", { name: `${todayText()} の記録を削除` })
    .click();
  const confirm = page.getByRole("dialog", {
    name: "この記録を削除しますか？",
  });
  await expect(confirm).toContainText(`${todayText()} の記録を削除します`);
  await confirm.getByRole("button", { name: "削除する" }).click();

  await expect(confirm).toBeHidden();
  await expect(page.getByText("記録を削除しました")).toBeVisible();
  await expect(page.getByText("まだありません")).toBeVisible();
});

test("4件以上は3件だけ出し、ほかの記録を表示で全部出す", async ({
  page,
  browserName,
}) => {
  const id = await createRecipe(page, uniqueWord(browserName));
  for (const date of [
    "2026-01-01",
    "2026-02-01",
    "2026-03-01",
    "2026-04-01",
    "2026-05-01",
  ]) {
    await addLog(page, id, date);
  }
  await page.goto(`/recipes/${id}`);

  const dates = page.locator("time");
  await expect(dates).toHaveText(["2026/05/01", "2026/04/01", "2026/03/01"]);

  await page.getByRole("button", { name: "ほかの記録を表示（2件）" }).click();

  await expect(dates).toHaveText([
    "2026/05/01",
    "2026/04/01",
    "2026/03/01",
    "2026/02/01",
    "2026/01/01",
  ]);
  await expect(
    page.getByRole("button", { name: /ほかの記録を表示/ }),
  ).toHaveCount(0);
});

test("記録すると、一覧の「最後に作った日が古い順」の並びが変わる", async ({
  page,
  browserName,
}) => {
  const word = uniqueWord(browserName);
  const first = await createRecipe(page, `${word}あ`);
  await createRecipe(page, `${word}い`);
  await addLog(page, first, "2026-01-01");
  const listUrl = `/?q=${encodeURIComponent(word)}&sort=last_cooked`;

  // 一度も作っていない「い」が先
  await page.goto(listUrl);
  const headings = page.getByRole("heading", { level: 2 });
  await expect(headings).toHaveText([`${word}い`, `${word}あ`]);

  // 画面から「い」を記録すると、古い順で「あ」が先になる
  await page.getByRole("link", { name: new RegExp(`${word}い`) }).click();
  await page.getByRole("button", { name: "作った", exact: true }).click();
  await page.getByRole("button", { name: "記録する" }).click();
  await expect(page.getByText("記録しました")).toBeVisible();
  await page.getByRole("link", { name: "一覧に戻る" }).click();

  await expect(page).toHaveURL(listUrl);
  await expect(headings).toHaveText([`${word}あ`, `${word}い`]);
});

test("記録の窓はやめることができ、次に開くと空に戻っている", async ({
  page,
  browserName,
}) => {
  const id = await createRecipe(page, uniqueWord(browserName));
  await page.goto(`/recipes/${id}`);

  await page.getByRole("button", { name: "作った", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "作った記録を残す" });
  await dialog.getByLabel(/ひとことメモ/).fill("書きかけ");
  await dialog.getByRole("button", { name: "やめる" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("まだありません")).toBeVisible();

  await page.getByRole("button", { name: "作った", exact: true }).click();
  await expect(dialog.getByLabel(/ひとことメモ/)).toHaveValue("");
});
