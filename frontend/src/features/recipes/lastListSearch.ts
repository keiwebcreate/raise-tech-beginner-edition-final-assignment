import { useSyncExternalStore } from "react";
import { parseRecipeSearch, toSearchString } from "./recipeSearch";

// 「一覧に戻る」で、最後に見ていた一覧の条件に戻す（画面設計書 1章）
// タブを閉じるまで覚えておけばよいので sessionStorage に入れる

const STORAGE_KEY = "recipe-box:list-search";

export function rememberListSearch(searchString: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, searchString);
  } catch {
    // 使えないブラウザでは、条件なしの一覧に戻るだけ
  }
}

function readListHref(): string {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY) ?? "";
    return `/${toSearchString(parseRecipeSearch(new URLSearchParams(stored)))}`;
  } catch {
    return "/";
  }
}

const subscribe = () => () => {};

export function useListHref(): string {
  return useSyncExternalStore(subscribe, readListHref, () => "/");
}
