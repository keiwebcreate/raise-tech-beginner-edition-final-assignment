import { type NextRequest, NextResponse } from "next/server";

// ログインしていない人をログイン画面へ移す（要件 F-61、詳細設計書 5.4）。
// これは表示の都合で、本当の守りはサーバー側（全 API が auth:sanctum）

const LOGIN_PATH = "/login";

export async function proxy(request: NextRequest) {
  const me = await fetchMe(request);
  const { pathname, search } = request.nextUrl;
  const isLoginPage = pathname === LOGIN_PATH;

  let response = NextResponse.next();
  if (me?.status === 401 && !isLoginPage) {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(url);
  } else if (me?.status === 200 && isLoginPage) {
    response = NextResponse.redirect(new URL("/", request.url));
  }

  // Laravel が新しくしたクッキー（セッションの延長など）を、ブラウザへ渡す
  for (const cookie of me?.headers.getSetCookie() ?? []) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}

// サーバーが止まっているなどで確かめられないときは null。画面を出し、API のエラーとして知らせる
async function fetchMe(request: NextRequest): Promise<Response | null> {
  const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:8000";
  // Sanctum は Origin を見て、画面からの要求だと判断する。本番は APP_URL で本当の住所を渡す
  const appOrigin = process.env.APP_URL ?? request.nextUrl.origin;

  try {
    return await fetch(`${apiOrigin}/api/me`, {
      headers: {
        Accept: "application/json",
        Cookie: request.headers.get("cookie") ?? "",
        Origin: appOrigin,
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return null;
  }
}

export const config = {
  // API と Next.js 自身のファイルには動かさない
  matcher: "/((?!api/|sanctum/|_next/static/|_next/image|favicon\\.ico).*)",
};
