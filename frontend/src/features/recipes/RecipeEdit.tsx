"use client";

import { RecipeForm, RecipeFormSkeleton } from "./RecipeForm";
import { useRecipe } from "./useRecipe";

// S-05 レシピ編集。レシピを読み込んでから、今の内容を入れたフォームを出す
export function RecipeEdit({ id, copied }: { id: number; copied: boolean }) {
  const recipe = useRecipe(id);
  const title = copied ? "レシピを編集（複製したレシピ）" : "レシピを編集";

  return recipe ? (
    <RecipeForm key={recipe.id} recipe={recipe} title={title} />
  ) : (
    <RecipeFormSkeleton title={title} />
  );
}
