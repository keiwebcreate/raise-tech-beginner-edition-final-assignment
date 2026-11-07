import { NotFoundContent } from "@/shared/components/ErrorPage";

// S-07 エラー（404）：ないレシピなど。ヘッダーは (main)/layout.tsx が出す
export default function MainNotFound() {
  return <NotFoundContent />;
}
