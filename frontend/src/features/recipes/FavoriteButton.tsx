"use client";

import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { Paginated, Recipe, RecipeListItem } from "@/shared/api/types";
import { setFavorite } from "./api";
import classes from "./FavoriteButton.module.css";

const MUTATION_KEY = ["favorite"];

// ★（F-07）。押したら先に表示を変え、失敗したら戻す（詳細設計書 5.5）
export function FavoriteButton({
  recipe,
  withLabel = false,
}: {
  recipe: { id: number; name: string; is_favorite: boolean };
  withLabel?: boolean;
}) {
  const toggle = useToggleFavorite(recipe.id);
  const { is_favorite: isFavorite } = recipe;

  return (
    <button
      type="button"
      className={withLabel ? classes.labeled : classes.icon}
      aria-pressed={isFavorite}
      aria-label={withLabel ? undefined : `${recipe.name}をお気に入りにする`}
      onClick={() => toggle.mutate(!isFavorite)}
    >
      <span
        className={isFavorite ? classes.on : classes.off}
        aria-hidden="true"
      >
        {isFavorite ? "★" : "☆"}
      </span>
      {withLabel && "お気に入り"}
    </button>
  );
}

function useToggleFavorite(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MUTATION_KEY,
    // 同じレシピを続けて押しても、押した順に送る
    scope: { id: `favorite-${id}` },
    mutationFn: (isFavorite: boolean) => setFavorite(id, isFavorite),
    onMutate: async (isFavorite) => {
      // 途中の取り直しの結果で、先に変えた表示が上書きされないようにする
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["recipes"] }),
        queryClient.cancelQueries({ queryKey: ["recipe", id] }),
      ]);
      showFavorite(queryClient, id, isFavorite);
    },
    onError: (_error, isFavorite) => {
      showFavorite(queryClient, id, !isFavorite);
    },
    onSettled: () => {
      // 続けて押している間は取り直さない。最後の1つが終わったら取り直す
      if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) === 1) {
        queryClient.invalidateQueries({ queryKey: ["recipes"] });
        queryClient.invalidateQueries({ queryKey: ["recipe", id] });
      }
    },
  });
}

function showFavorite(
  queryClient: QueryClient,
  id: number,
  isFavorite: boolean,
): void {
  queryClient.setQueriesData<Paginated<RecipeListItem>>(
    { queryKey: ["recipes"] },
    (old) =>
      old && {
        ...old,
        data: old.data.map((item) =>
          item.id === id ? { ...item, is_favorite: isFavorite } : item,
        ),
      },
  );
  queryClient.setQueryData<Recipe>(
    ["recipe", id],
    (old) => old && { ...old, is_favorite: isFavorite },
  );
}
