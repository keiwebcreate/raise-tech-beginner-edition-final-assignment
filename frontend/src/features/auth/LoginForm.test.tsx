import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/shared/api/client";
import { render } from "@/shared/test/render";
import { LoginForm } from "./LoginForm";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/client")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

beforeEach(() => {
  replace.mockClear();
  apiFetchMock.mockReset();
});

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/メールアドレス/), "a@example.com");
  await user.type(screen.getByLabelText(/パスワード/), "password");
  await user.click(screen.getByRole("button", { name: "ログイン" }));
}

it("「ログイン状態を保持する」は最初からオンで、パスワードは伏せ字", () => {
  render(<LoginForm next="/" />);

  expect(screen.getByLabelText("ログイン状態を保持する")).toBeChecked();
  expect(screen.getByLabelText(/パスワード/)).toHaveAttribute(
    "type",
    "password",
  );
});

it("入力した内容を送り、成功したら戻り先へ移る", async () => {
  apiFetchMock.mockResolvedValueOnce(undefined);
  render(<LoginForm next="/recipes/1" />);

  await fillAndSubmit();

  expect(apiFetchMock).toHaveBeenCalledWith("/api/login", {
    method: "POST",
    body: { email: "a@example.com", password: "password", remember: true },
    quiet: true,
  });
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/recipes/1"));
});

it("React の状態を通らずに入った値（動き出す前の入力・自動入力）も送る", async () => {
  apiFetchMock.mockResolvedValueOnce(undefined);
  render(<LoginForm next="/" />);

  // 入力のイベントを出さずに、入力欄の値だけを変える
  (screen.getByLabelText(/メールアドレス/) as HTMLInputElement).value =
    "auto@example.com";
  (screen.getByLabelText(/パスワード/) as HTMLInputElement).value = "autofill";
  await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

  expect(apiFetchMock).toHaveBeenCalledWith("/api/login", {
    method: "POST",
    body: { email: "auto@example.com", password: "autofill", remember: true },
    quiet: true,
  });
});

it("チェックを外すと、保持しないで送る", async () => {
  apiFetchMock.mockResolvedValueOnce(undefined);
  render(<LoginForm next="/" />);

  await userEvent.click(screen.getByLabelText("ログイン状態を保持する"));
  await fillAndSubmit();

  expect(apiFetchMock).toHaveBeenCalledWith("/api/login", {
    method: "POST",
    body: { email: "a@example.com", password: "password", remember: false },
    quiet: true,
  });
});

it("失敗したら文言をフォームの上に出し、画面は移らない", async () => {
  apiFetchMock.mockRejectedValueOnce(
    new ApiError(422, "メールアドレスかパスワードが違います"),
  );
  render(<LoginForm next="/" />);

  await fillAndSubmit();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "メールアドレスかパスワードが違います",
  );
  expect(replace).not.toHaveBeenCalled();
});

it("回数制限の文言もフォームの上に出す", async () => {
  apiFetchMock.mockRejectedValueOnce(
    new ApiError(429, "しばらく受け付けません。1分後にもう一度お試しください"),
  );
  render(<LoginForm next="/" />);

  await fillAndSubmit();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "しばらく受け付けません。1分後にもう一度お試しください",
  );
});

it("入力の誤りは、その項目のすぐ下にも出す", async () => {
  apiFetchMock.mockRejectedValueOnce(
    new ApiError(422, "入力に誤りがあります", {
      email: ["メールアドレスを入力してください"],
    }),
  );
  render(<LoginForm next="/" />);

  await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "入力に誤りがあります",
  );
  expect(
    screen.getByText("メールアドレスを入力してください"),
  ).toBeInTheDocument();
});
