"use client";

import { Alert, Button, Checkbox, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/shared/api/client";
import { Logo } from "@/shared/components/Logo";
import classes from "./LoginForm.module.css";

type LoginValues = {
  email: string;
  password: string;
  remember: boolean;
};

// S-01 ログイン（画面設計書 4章）
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  // React が動き出す前は、ボタンを押すとブラウザの標準の送信になり、パスワードが URL に入ってしまう。
  // そうならないよう、動き出すまで押せないようにする（押せないと Enter でも送られない）
  const [isReady, setIsReady] = useState(false);
  useEffect(() => setIsReady(true), []);

  // uncontrolled：入力の値を React の状態で上書きしない。
  // 動き出す前に入力された値や、パスワードの自動入力の値が消えないようにするため
  const form = useForm<LoginValues>({
    mode: "uncontrolled",
    initialValues: { email: "", password: "", remember: true },
  });

  const login = useMutation({
    mutationFn: (values: LoginValues) =>
      apiFetch<void>("/api/login", {
        method: "POST",
        body: values,
        // エラーは通知ではなく、フォームの上に出す
        quiet: true,
      }),
    onSuccess: () => router.replace(next),
    onError: (error) => {
      setFormError(error.message);
      if (error instanceof ApiError) {
        form.setErrors(
          Object.fromEntries(
            Object.entries(error.errors).map(([field, messages]) => [
              field,
              messages[0],
            ]),
          ),
        );
      }
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    form.clearErrors();

    // 動き出す前の入力も含めて送れるよう、入力欄の実際の値を読む
    const data = new FormData(event.currentTarget);
    login.mutate({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      remember: data.has("remember"),
    });
  }

  return (
    <main className={classes.center}>
      <form
        className={classes.sheet}
        // 入力のチェックはサーバーの文言にそろえる（ブラウザの吹き出しを出さない）
        noValidate
        onSubmit={handleSubmit}
      >
        <h1 className={classes.logo}>
          <Logo />
        </h1>
        <Text className={classes.lead}>自分だけのレシピノート</Text>

        <Stack gap="md">
          {formError && <Alert color="red">{formError}</Alert>}
          <TextInput
            label="メールアドレス"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            size="md"
            withAsterisk
            name="email"
            key={form.key("email")}
            {...form.getInputProps("email")}
          />
          <TextInput
            label="パスワード"
            type="password"
            autoComplete="current-password"
            size="md"
            withAsterisk
            name="password"
            key={form.key("password")}
            {...form.getInputProps("password")}
          />
          <Checkbox
            label="ログイン状態を保持する"
            name="remember"
            key={form.key("remember")}
            {...form.getInputProps("remember", { type: "checkbox" })}
          />
          <Button
            type="submit"
            size="md"
            fullWidth
            disabled={!isReady}
            // 成功のあとも、画面が変わるまで押せないようにする
            loading={login.isPending || login.isSuccess}
          >
            ログイン
          </Button>
        </Stack>
      </form>
    </main>
  );
}
