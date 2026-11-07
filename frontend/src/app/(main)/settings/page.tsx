import type { Metadata } from "next";
import { Settings } from "@/features/auth/Settings";

export const metadata: Metadata = {
  title: "設定 | Recipe Box",
};

export default function SettingsPage() {
  return (
    <main>
      <Settings />
    </main>
  );
}
