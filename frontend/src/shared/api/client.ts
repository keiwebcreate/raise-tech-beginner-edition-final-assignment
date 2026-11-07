import { notifications } from "@mantine/notifications";

// すべての API はこの関数を通す（詳細設計書 5.3）

const NETWORK_ERROR_MESSAGE =
  "通信できませんでした。時間をおいてもう一度お試しください";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    // 入力の誤り（422）のとき、項目ごとの文言が入る
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  // true なら赤い通知を出さない。呼び出し元がフォームの上などに表示するとき
  quiet?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(0, NETWORK_ERROR_MESSAGE);

    if (!options.quiet && shouldNotify(apiError.status)) {
      notifications.show({
        color: "red",
        message: apiError.message,
        autoClose: false,
      });
    }
    throw apiError;
  }
}

async function request<T>(
  path: string,
  options: ApiOptions,
  retried = false,
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };

  // データを変える要求には、毎回 合言葉（CSRF）を付ける
  if (method !== "GET") {
    headers["X-XSRF-TOKEN"] = await getCsrfToken();
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    // 写真を送るとき。Content-Type はブラウザが決める
    body = options.body;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(path, {
    method,
    headers,
    body,
    credentials: "same-origin",
  });

  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T;
  }

  // 合言葉の期限切れ：もらい直して、1回だけやり直す
  if (response.status === 419 && !retried) {
    await fetchCsrfCookie();
    return request<T>(path, options, true);
  }

  const data = await readErrorBody(response);

  if (response.status === 401) {
    redirectToLogin();
  }

  throw new ApiError(response.status, data.message, data.errors);
}

function shouldNotify(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}

async function getCsrfToken(): Promise<string> {
  const token = readCookie("XSRF-TOKEN");
  if (token !== null) {
    return token;
  }
  await fetchCsrfCookie();
  return readCookie("XSRF-TOKEN") ?? "";
}

async function fetchCsrfCookie(): Promise<void> {
  await fetch("/sanctum/csrf-cookie", {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const found = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix));
  // クッキーの値は URL の形で書かれているので、元に戻してから送る
  return found ? decodeURIComponent(found.slice(prefix.length)) : null;
}

async function readErrorBody(
  response: Response,
): Promise<{ message: string; errors?: Record<string, string[]> }> {
  try {
    return await response.json();
  } catch {
    return { message: "エラーが起きました" };
  }
}

function redirectToLogin(): void {
  const { pathname, search } = window.location;
  if (pathname !== "/login") {
    const next = encodeURIComponent(pathname + search);
    window.location.assign(`/login?next=${next}`);
  }
}
