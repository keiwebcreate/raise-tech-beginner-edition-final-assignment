import { notifications } from "@mantine/notifications";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/shared/api/client";
import { render } from "@/shared/test/render";
import { RecipeForm } from "./RecipeForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/client")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);
let saveResult: () => Promise<unknown>;

beforeEach(() => {
  push.mockClear();
  vi.mocked(notifications.show).mockClear();
  window.scrollTo = vi.fn();
  saveResult = async () => ({ id: 12 });
  apiFetchMock.mockReset();
  apiFetchMock.mockImplementation(async (path: string) => {
    if (path === "/api/categories") {
      return { data: [{ id: 1, name: "主菜" }] };
    }
    if (path === "/api/tags") {
      return { data: [{ id: 3, name: "時短", recipes_count: 8 }] };
    }
    return saveResult();
  });
});

function sentFormData(): FormData {
  const call = apiFetchMock.mock.calls.find(
    ([path]) => path === "/api/recipes",
  );
  return call?.[1]?.body as FormData;
}

async function renderForm() {
  render(<RecipeForm />);
  return await screen.findByLabelText(/料理名/);
}

it("カテゴリを読み込むとフォームが出て、何人分の初期値は2", async () => {
  await renderForm();

  expect(screen.getByLabelText(/何人分/)).toHaveValue("2");
  expect(
    screen.getByRole("heading", { level: 1, name: "レシピを追加" }),
  ).toBeInTheDocument();
});

it("材料と手順の行を追加・削除できる", async () => {
  const user = userEvent.setup();
  await renderForm();

  // 1行だけのときは消せない
  expect(screen.getByRole("button", { name: "材料1を削除" })).toBeDisabled();

  await user.click(screen.getByRole("button", { name: "＋ 材料を追加" }));
  await user.type(screen.getByLabelText("材料名2"), "塩");
  await user.click(screen.getByRole("button", { name: "材料1を削除" }));

  expect(screen.getByLabelText("材料名1")).toHaveValue("塩");
  expect(screen.queryByLabelText("材料名2")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "＋ 手順を追加" }));
  expect(screen.getByLabelText("手順2")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "手順2を削除" }));
  expect(screen.queryByLabelText("手順2")).not.toBeInTheDocument();
});

it("保存すると、詳細画面へ移り「保存しました」と出す", async () => {
  const user = userEvent.setup();
  await renderForm();

  await user.type(screen.getByLabelText(/料理名/), "肉じゃが");
  await user.type(screen.getByLabelText("材料名1"), "じゃがいも");
  await user.type(screen.getByLabelText("手順1"), "切る");
  await user.click(screen.getByRole("button", { name: "保存する" }));

  await waitFor(() => expect(push).toHaveBeenCalledWith("/recipes/12"));
  expect(notifications.show).toHaveBeenCalledWith({
    color: "green",
    message: "保存しました",
  });
  const data = sentFormData();
  expect(data.get("name")).toBe("肉じゃが");
  expect(data.get("ingredients[0][name]")).toBe("じゃがいも");
  expect(data.get("steps[0][body]")).toBe("切る");
});

it("入力の誤りは、項目の下とフォームの上に出す（空の行を除いても正しい行に出す）", async () => {
  const user = userEvent.setup();
  saveResult = async () => {
    throw new ApiError(422, "入力に誤りがあります", {
      name: ["料理名を入力してください"],
      "ingredients.0.quantity": ["分量は30文字までにしてください"],
    });
  };
  await renderForm();

  // 1行目を空のままにして、2行目だけを入力する
  await user.click(screen.getByRole("button", { name: "＋ 材料を追加" }));
  await user.type(screen.getByLabelText("材料名2"), "塩");
  await user.click(screen.getByRole("button", { name: "保存する" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "入力に誤りがあります",
  );
  expect(screen.getByText("料理名を入力してください")).toBeInTheDocument();
  expect(screen.getByLabelText("分量2")).toBeInvalid();
  expect(screen.getByLabelText("分量1")).toBeValid();
  expect(push).not.toHaveBeenCalled();
  expect(notifications.show).not.toHaveBeenCalled();
});

it("通信の失敗などは、赤い通知で知らせて入力は残す", async () => {
  const user = userEvent.setup();
  saveResult = async () => {
    throw new ApiError(500, "エラーが起きました");
  };
  await renderForm();

  await user.type(screen.getByLabelText(/料理名/), "肉じゃが");
  await user.click(screen.getByRole("button", { name: "保存する" }));

  await waitFor(() =>
    expect(notifications.show).toHaveBeenCalledWith({
      color: "red",
      message: "保存できませんでした。時間をおいてもう一度お試しください",
      autoClose: false,
    }),
  );
  expect(screen.getByLabelText(/料理名/)).toHaveValue("肉じゃが");
  expect(push).not.toHaveBeenCalled();
});

it("何も変えていなければ、やめるでそのまま戻る", async () => {
  const user = userEvent.setup();
  await renderForm();

  await user.click(screen.getByRole("button", { name: "やめる" }));

  expect(push).toHaveBeenCalledWith("/");
});

it("入力が変わっていれば、やめるで確かめる", async () => {
  const user = userEvent.setup();
  await renderForm();

  await user.type(screen.getByLabelText(/料理名/), "肉じゃが");
  await user.click(screen.getByRole("button", { name: "やめる" }));

  const dialog = await screen.findByRole("dialog", {
    name: "変更を捨てますか？",
  });
  expect(push).not.toHaveBeenCalled();

  await user.click(
    within(dialog).getByRole("button", { name: "変更を捨てる" }),
  );
  expect(push).toHaveBeenCalledWith("/");
});
