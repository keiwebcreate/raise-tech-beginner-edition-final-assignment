import { AppHeader } from "@/shared/components/AppHeader";
import { NotFoundContent } from "@/shared/components/ErrorPage";

// S-07 エラー（404）：どの画面にも当てはまらない URL。(main) の外なのでヘッダーをここで出す
export default function NotFound() {
  return (
    <>
      <AppHeader />
      <NotFoundContent />
    </>
  );
}
