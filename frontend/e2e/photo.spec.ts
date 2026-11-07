import { expect, type Locator, test } from "@playwright/test";
import { createRecipe, OWNER, submitLogin, uniqueWord } from "./helpers";

// レシピの完成写真の通しのテスト（要件 F-21〜F-23）

// 1ピクセルの PNG（赤と青）。縮小と WebP への変換はサーバーのテストで確かめる
const RED_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
);
const BLUE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==",
  "base64",
);

function png(buffer: Buffer) {
  return { name: "dish.png", mimeType: "image/png", buffer };
}

// 画像が本当に読み込めたか（URL の署名が正しいか）を確かめる
async function expectLoaded(image: Locator) {
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThan(0);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await submitLogin(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL("/");
});

test("写真つきで登録すると、一覧と詳細に出て、差し替えと削除ができる", async ({
  page,
  browserName,
}) => {
  const name = uniqueWord(browserName);

  // 登録
  await page.goto("/recipes/new");
  await page.getByLabel(/料理名/).fill(name);
  await page.getByRole("combobox", { name: /カテゴリ/ }).click();
  await page.getByRole("option", { name: "主菜" }).click();
  await page.getByLabel("完成写真").setInputFiles(png(RED_PNG));
  await expectLoaded(page.getByRole("img", { name: "完成写真" }));
  await page.getByLabel("材料名1").fill("牛肉");
  await page.getByLabel("手順1", { exact: true }).fill("焼く");
  await page.getByRole("button", { name: "保存する" }).click();

  // 詳細
  await expect(page).toHaveURL(/\/recipes\/\d+$/);
  const detailPhoto = page.getByRole("img", { name: `${name}の写真` });
  await expectLoaded(detailPhoto);
  const firstUrl = await detailPhoto.getAttribute("src");
  expect(firstUrl).toContain("recipes/large/");
  const detailUrl = page.url();

  // 一覧は小さい方の写真を使う
  await page.goto(`/?q=${encodeURIComponent(name)}`);
  const thumbnail = page.getByRole("main").locator("img");
  await expectLoaded(thumbnail);
  expect(await thumbnail.getAttribute("src")).toContain("recipes/thumb/");

  // 差し替え
  await page.goto(`${detailUrl}/edit`);
  await expectLoaded(page.getByRole("img", { name: "完成写真" }));
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "写真を変える" }).click();
  await (await chooser).setFiles(png(BLUE_PNG));
  await page.getByRole("button", { name: "保存する" }).click();

  await expect(page).toHaveURL(detailUrl);
  await expectLoaded(detailPhoto);
  const secondUrl = await detailPhoto.getAttribute("src");
  const fileOf = (url: string | null) => url?.split("?")[0].split("/").pop();
  expect(fileOf(secondUrl)).not.toBe(fileOf(firstUrl));

  // 古い写真は保存先からも消えている
  const oldResponse = await page.request.get(firstUrl ?? "");
  expect(oldResponse.status()).toBe(404);

  // 削除
  await page.goto(`${detailUrl}/edit`);
  await page.getByRole("button", { name: "写真を削除" }).click();
  await expect(page.getByLabel("完成写真")).toBeAttached();
  await page.getByRole("button", { name: "保存する" }).click();

  await expect(page).toHaveURL(detailUrl);
  await expect(page.getByRole("img", { name: "写真なし" })).toBeVisible();
  await expect(detailPhoto).toHaveCount(0);
});

test("写真がないレシピは、一覧と詳細に No Image の画像を出す", async ({
  page,
  browserName,
}) => {
  const name = uniqueWord(browserName);
  const id = await createRecipe(page, name);

  await page.goto(`/?q=${encodeURIComponent(name)}`);
  await expect(
    page.getByRole("main").getByRole("img", { name: "写真なし" }),
  ).toBeVisible();

  await page.goto(`/recipes/${id}`);
  await expect(page.getByRole("img", { name: "写真なし" })).toContainText(
    "No Image",
  );
});

test("受け付けないファイルは、選んだ時点で理由を知らせる", async ({ page }) => {
  await page.goto("/recipes/new");

  await page.getByLabel("完成写真").setInputFiles({
    name: "note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("text"),
  });
  await expect(
    page.getByText("写真は JPEG・PNG・WebP のどれかにしてください"),
  ).toBeVisible();

  await page.getByLabel("完成写真").setInputFiles({
    name: "big.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.getByText("写真は5MBまでにしてください")).toBeVisible();

  await page.getByLabel("完成写真").setInputFiles(png(RED_PNG));
  await expectLoaded(page.getByRole("img", { name: "完成写真" }));
  await expect(page.getByText("写真は5MBまでにしてください")).toHaveCount(0);
});

test("写真を選んでから編集をやめると、確かめる", async ({
  page,
  browserName,
}) => {
  const id = await createRecipe(page, uniqueWord(browserName));
  await page.goto(`/recipes/${id}/edit`);

  await page.getByLabel("完成写真").setInputFiles(png(RED_PNG));
  await page.getByRole("button", { name: "やめる" }).click();

  await expect(
    page.getByRole("dialog", { name: "変更を捨てますか？" }),
  ).toBeVisible();
});
