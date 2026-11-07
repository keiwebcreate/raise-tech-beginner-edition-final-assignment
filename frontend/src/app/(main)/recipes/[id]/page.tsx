import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeDetail } from "@/features/recipes/RecipeDetail";

export const metadata: Metadata = {
  title: "レシピ | Recipe Box",
};

export default async function RecipePage({
  params,
}: PageProps<"/recipes/[id]">) {
  const { id } = await params;

  // ID は数字だけ。それ以外は API を呼ばずに 404 にする
  if (!/^[1-9]\d*$/.test(id)) {
    notFound();
  }

  return <RecipeDetail id={Number(id)} />;
}
