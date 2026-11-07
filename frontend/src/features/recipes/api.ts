import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api/client";
import type {
  Category,
  Paginated,
  Recipe,
  RecipeListItem,
  Tag,
} from "@/shared/api/types";
import { type RecipeSearch, toSearchString } from "./recipeSearch";

// レシピまわりの API と、TanStack Query の名札（詳細設計書 5.5）

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () =>
    (await apiFetch<{ data: Category[] }>("/api/categories")).data,
  // カテゴリは固定なので、取り直さない
  staleTime: Number.POSITIVE_INFINITY,
});

export const tagsQuery = queryOptions({
  queryKey: ["tags"],
  queryFn: async () => (await apiFetch<{ data: Tag[] }>("/api/tags")).data,
});

export function recipesQuery(search: RecipeSearch) {
  return queryOptions({
    queryKey: ["recipes", search],
    queryFn: () =>
      apiFetch<Paginated<RecipeListItem>>(
        `/api/recipes${toSearchString(search)}`,
        // エラーは画面（S-07）で知らせるので、通知は出さない
        { quiet: true },
      ),
    // 条件を変えても、新しい結果が届くまで今の一覧を出しておく
    placeholderData: keepPreviousData,
  });
}

export function recipeQuery(id: number) {
  return queryOptions({
    queryKey: ["recipe", id],
    // エラーは画面（S-07）で知らせるので、通知は出さない
    queryFn: () => apiFetch<Recipe>(`/api/recipes/${id}`, { quiet: true }),
  });
}

export function setFavorite(id: number, isFavorite: boolean) {
  return apiFetch<{ is_favorite: boolean }>(`/api/recipes/${id}/favorite`, {
    method: isFavorite ? "PUT" : "DELETE",
  });
}

export function createRecipe(data: FormData) {
  return apiFetch<Recipe>("/api/recipes", {
    method: "POST",
    body: data,
    // エラーはフォームで知らせる
    quiet: true,
  });
}
