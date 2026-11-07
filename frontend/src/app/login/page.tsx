import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/LoginForm";
import { safeNextPath } from "@/features/auth/safeNextPath";

export const metadata: Metadata = {
  title: "ログイン | Recipe Box",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <LoginForm
      next={safeNextPath(typeof next === "string" ? next : undefined)}
    />
  );
}
