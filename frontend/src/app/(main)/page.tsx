import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, RecipeList } from "@/features/recipes/RecipeList";

export const metadata: Metadata = {
  title: "レシピ一覧 | Recipe Box",
};

export default function HomePage() {
  return (
    // 検索条件は URL からブラウザで読むので、それまでは仮の表示を出す
    <Suspense fallback={<ListSkeleton />}>
      <RecipeList />
    </Suspense>
  );
}
