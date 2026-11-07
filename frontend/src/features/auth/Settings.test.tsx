import { notifications } from "@mantine/notifications";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/shared/api/client";
import { render } from "@/shared/test/render";
import { Settings } from "./Settings";

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/client")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);
const assign = vi.fn();

// /api/me だけはいつも答え、それ以外は渡した関数に任せる
function mockApi(other: () => Promise<unknown> = async () => undefined) {
  apiFetchMock.mockImplementation((async (path: string) =>
    path === "/api/me"
      ? { email: "you@example.com" }
      : other()) as typeof apiFetch);
}

function changeCalls() {
  return apiFetchMock.mock.calls.filter(
    ([path]) => path === "/api/me/password",
  );
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/^今のパスワード/), "old-password");
  await user.type(
    screen.getByLabelText(/^新しいパスワード \*/),
    "new-password",
  );
  await user.type(
    screen.getByLabelText(/^新しいパスワード（確認）/),
    "new-password",
  );
  await user.click(screen.getByRole("button", { name: "変更する" }));
}

beforeEach(() => {
  apiFetchMock.mockReset();
  vi.mocked(notifications.show).mockClear();
  assign.mockClear();
  vi.stubGlobal("location", { pathname: "/settings", search: "", assign });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("3つの欄はどれも伏せ字で、ログイン中のメールアドレスを出す", async () => {
  mockApi();
  render(<Settings />);

  expect(
    await screen.findByText("ログイン中：you@example.com"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/^今のパスワード/)).toHaveAttribute(
    "type",
    "password",
  );
  expect(screen.getByLabelText(/^新しいパスワード \*/)).toHaveAttribute(
    "type",
    "password",
  );
  expect(screen.getByLabelText(/^新しいパスワード（確認）/)).toHaveAttribute(
    "type",
    "password",
  );
});

it("入力した内容を送り、成功したら知らせて欄を空にする", async () => {
  mockApi();
  render(<Settings />);

  await fillAndSubmit();

  await waitFor(() =>
    expect(notifications.show).toHaveBeenCalledWith({
      color: "green",
      message: "パスワードを変更しました",
    }),
  );
  expect(changeCalls()).toEqual([
    [
      "/api/me/password",
      {
        method: "PUT",
        body: {
          current_password: "old-password",
          password: "new-password",
          password_confirmation: "new-password",
        },
      },
    ],
  ]);
  await waitFor(() =>
    expect(screen.getByLabelText(/^今のパスワード/)).toHaveValue(""),
  );
  expect(screen.getByLabelText(/^新しいパスワード \*/)).toHaveValue("");
  expect(screen.getByLabelText(/^新しいパスワード（確認）/)).toHaveValue("");
});

it("サーバーが返した入力の誤りを項目の下に出し、入力は残す", async () => {
  mockApi(async () => {
    throw new ApiError(422, "入力に誤りがあります", {
      current_password: ["今のパスワードが違います"],
    });
  });
  render(<Settings />);

  await fillAndSubmit();

  expect(
    await screen.findByText("今のパスワードが違います"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/^新しいパスワード \*/)).toHaveValue(
    "new-password",
  );
  expect(notifications.show).not.toHaveBeenCalled();
});

it("ログアウトを押すと API を呼び、ログイン画面へ移る", async () => {
  mockApi();
  render(<Settings />);

  await userEvent.click(screen.getByRole("button", { name: "ログアウト" }));

  await waitFor(() => expect(assign).toHaveBeenCalledWith("/login"));
  expect(apiFetchMock).toHaveBeenCalledWith("/api/logout", { method: "POST" });
});

it("ログアウトに失敗したら、画面は移らず、もう一度押せる", async () => {
  mockApi(async () => {
    throw new ApiError(0, "通信できませんでした");
  });
  render(<Settings />);
  const button = screen.getByRole("button", { name: "ログアウト" });

  await userEvent.click(button);

  await waitFor(() => expect(button).toBeEnabled());
  expect(assign).not.toHaveBeenCalled();
});
