import { notifications } from "@mantine/notifications";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./client";

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

const fetchMock = vi.fn<typeof fetch>();

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status });
}

function clearCsrfCookie() {
  // biome-ignore lint/suspicious/noDocumentCookie: テストでクッキーを消すため
  document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

function setCsrfCookie(value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: テストでクッキーを用意するため
  document.cookie = `XSRF-TOKEN=${value}`;
}

function sentHeaders(call: number): Record<string, string> {
  return fetchMock.mock.calls[call][1]?.headers as Record<string, string>;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(notifications.show).mockClear();
  clearCsrfCookie();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("GET は合言葉なしで呼び、JSON を返す", async () => {
  fetchMock.mockResolvedValueOnce(json(200, { email: "a@example.com" }));

  await expect(apiFetch("/api/me")).resolves.toEqual({
    email: "a@example.com",
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(sentHeaders(0).Accept).toBe("application/json");
  expect(sentHeaders(0)["X-XSRF-TOKEN"]).toBeUndefined();
  expect(fetchMock.mock.calls[0][1]?.credentials).toBe("same-origin");
});

it("データを変える要求には、クッキーの合言葉を元の形に戻して付ける", async () => {
  setCsrfCookie("abc%3D");
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

  await expect(
    apiFetch("/api/login", { method: "POST", body: { a: 1 } }),
  ).resolves.toBeUndefined();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(sentHeaders(0)["X-XSRF-TOKEN"]).toBe("abc=");
  expect(sentHeaders(0)["Content-Type"]).toBe("application/json");
  expect(fetchMock.mock.calls[0][1]?.body).toBe('{"a":1}');
});

it("合言葉のクッキーがなければ、先にもらう", async () => {
  fetchMock.mockImplementationOnce(async () => {
    setCsrfCookie("new-token");
    return new Response(null, { status: 204 });
  });
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

  await apiFetch("/api/login", { method: "POST" });

  expect(fetchMock.mock.calls[0][0]).toBe("/sanctum/csrf-cookie");
  expect(fetchMock.mock.calls[1][0]).toBe("/api/login");
  expect(sentHeaders(1)["X-XSRF-TOKEN"]).toBe("new-token");
});

it("419 なら合言葉をもらい直して、1回だけやり直す", async () => {
  setCsrfCookie("old");
  fetchMock.mockResolvedValueOnce(json(419, { message: "期限切れ" }));
  fetchMock.mockImplementationOnce(async () => {
    setCsrfCookie("new");
    return new Response(null, { status: 204 });
  });
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

  await apiFetch("/api/login", { method: "POST" });

  expect(fetchMock.mock.calls[1][0]).toBe("/sanctum/csrf-cookie");
  expect(sentHeaders(2)["X-XSRF-TOKEN"]).toBe("new");
});

it("419 が続いたら、やり直しをやめてエラーにする", async () => {
  setCsrfCookie("old");
  fetchMock.mockImplementation(async () => json(419, { message: "期限切れ" }));

  await expect(apiFetch("/api/x", { method: "POST" })).rejects.toMatchObject({
    status: 419,
  });

  // 元の要求 → もらい直し → やり直しの3回だけ
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it("422 は項目ごとの文言を持ったエラーにし、通知は出さない", async () => {
  setCsrfCookie("t");
  fetchMock.mockResolvedValueOnce(
    json(422, {
      message: "入力に誤りがあります",
      errors: { email: ["メールアドレスを入力してください"] },
    }),
  );

  const error = await apiFetch<never>("/api/x", { method: "POST" }).catch(
    (e: ApiError) => e,
  );

  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(422);
  expect(error.errors.email).toEqual(["メールアドレスを入力してください"]);
  expect(notifications.show).not.toHaveBeenCalled();
});

it.each([
  [429, "しばらく受け付けません"],
  [500, "エラーが起きました"],
])("%i は赤い通知を出す", async (status, message) => {
  fetchMock.mockResolvedValueOnce(json(status, { message }));

  await expect(apiFetch("/api/x")).rejects.toMatchObject({ status, message });

  expect(notifications.show).toHaveBeenCalledWith({
    color: "red",
    message,
    autoClose: false,
  });
});

it("通信に失敗したら赤い通知を出す", async () => {
  fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

  await expect(apiFetch("/api/x")).rejects.toMatchObject({ status: 0 });

  expect(notifications.show).toHaveBeenCalledOnce();
});

it("quiet なら通知を出さない", async () => {
  fetchMock.mockResolvedValueOnce(json(429, { message: "待って" }));

  await expect(apiFetch("/api/x", { quiet: true })).rejects.toMatchObject({
    status: 429,
    message: "待って",
  });

  expect(notifications.show).not.toHaveBeenCalled();
});

it("401 ならログイン画面へ移す（戻り先の URL を付ける）", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", {
    pathname: "/recipes/1",
    search: "?a=1",
    assign,
  });
  fetchMock.mockResolvedValueOnce(
    json(401, { message: "ログインしてください" }),
  );

  await expect(apiFetch("/api/x")).rejects.toMatchObject({ status: 401 });

  expect(assign).toHaveBeenCalledWith("/login?next=%2Frecipes%2F1%3Fa%3D1");
});

it("ログイン画面で 401 になっても、移動をくり返さない", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { pathname: "/login", search: "", assign });
  fetchMock.mockResolvedValueOnce(
    json(401, { message: "ログインしてください" }),
  );

  await expect(apiFetch("/api/x")).rejects.toMatchObject({ status: 401 });

  expect(assign).not.toHaveBeenCalled();
});
