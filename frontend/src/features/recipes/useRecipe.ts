import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { ApiError } from "@/shared/api/client";
import { recipeQuery } from "./api";

// 詳細と編集で使う。ないレシピは 404 の画面、そのほかのエラーは 500 の画面に任せる
export function useRecipe(id: number) {
  const { data, error } = useQuery(recipeQuery(id));

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    // 401 は、共通の関数がログイン画面へ移す
    if (!(error instanceof ApiError && error.status === 401)) {
      throw error;
    }
  }

  return data;
}
