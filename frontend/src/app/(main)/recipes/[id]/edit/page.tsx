import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeEdit } from "@/features/recipes/RecipeEdit";

export const metadata: Metadata = {
  title: "レシピを編集 | Recipe Box",
};

export default async function EditRecipePage({
  params,
  searchParams,
}: PageProps<"/recipes/[id]/edit">) {
  const { id } = await params;
  const { copied } = await searchParams;

  // ID は数字だけ。それ以外は API を呼ばずに 404 にする
  if (!/^[1-9]\d*$/.test(id)) {
    notFound();
  }

  return (
    <main>
      <RecipeEdit id={Number(id)} copied={copied === "1"} />
    </main>
  );
}
