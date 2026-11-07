import { AppHeader } from "@/shared/components/AppHeader";

// ヘッダーつきの画面の共通部分
export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
