import type { Metadata } from "next";
import { RecipeForm } from "@/features/recipes/RecipeForm";

export const metadata: Metadata = {
  title: "レシピを追加 | Recipe Box",
};

export default function NewRecipePage() {
  return (
    <main>
      <RecipeForm />
    </main>
  );
}
