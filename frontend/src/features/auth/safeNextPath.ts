const DEFAULT_PATH = "/";
// 置き場所を調べるためだけの仮の住所。実際には通信しない
const BASE = "http://recipe-box.invalid";

// ログイン後の戻り先を、自分のサイトの中の URL だけに絞る（詳細設計書 5.4）。
// 「//evil.example」や「/\evil.example」のように、外のサイトに移される形を防ぐ
export function safeNextPath(next: string | undefined): string {
  if (!next?.startsWith("/")) {
    return DEFAULT_PATH;
  }
  try {
    const url = new URL(next, BASE);
    // 「/.//evil.example」は整えると「//evil.example」になるので、整えたあとの形も確かめる
    if (
      url.origin !== BASE ||
      url.pathname === "/login" ||
      url.pathname.startsWith("//")
    ) {
      return DEFAULT_PATH;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return DEFAULT_PATH;
  }
}
