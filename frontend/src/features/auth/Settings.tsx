"use client";

import { Button, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/shared/api/client";
import classes from "./Settings.module.css";

// S-06 設定（画面設計書 4章）
export function Settings() {
  return (
    <div className={classes.container}>
      <h1 className={classes.title}>設定</h1>
      <div className={classes.sheet}>
        <PasswordSection />
        <LogoutSection />
      </div>
    </div>
  );
}

type PasswordValues = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

function PasswordSection() {
  // ログイン画面と同じく、動き出す前に送るとパスワードが URL に入るので、それまで押せないようにする
  const [isReady, setIsReady] = useState(false);
  useEffect(() => setIsReady(true), []);

  const form = useForm<PasswordValues>({
    mode: "uncontrolled",
    initialValues: {
      current_password: "",
      password: "",
      password_confirmation: "",
    },
  });

  const change = useMutation({
    mutationFn: (values: PasswordValues) =>
      apiFetch<void>("/api/me/password", { method: "PUT", body: values }),
    onSuccess: () => {
      form.reset();
      notifications.show({
        color: "green",
        message: "パスワードを変更しました",
      });
    },
    onError: (error) => {
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
    form.clearErrors();

    // パスワードの自動入力の値も送れるよう、入力欄の実際の値を読む
    const data = new FormData(event.currentTarget);
    change.mutate({
      current_password: String(data.get("current_password") ?? ""),
      password: String(data.get("password") ?? ""),
      password_confirmation: String(data.get("password_confirmation") ?? ""),
    });
  }

  return (
    <section className={classes.box}>
      <h2 className={classes.sectionTitle}>パスワードの変更</h2>
      {/* 入力のチェックはサーバーの文言にそろえる（ブラウザの吹き出しを出さない） */}
      <form noValidate onSubmit={handleSubmit}>
        <Stack gap="md" align="flex-start">
          <TextInput
            className={classes.input}
            label="今のパスワード"
            type="password"
            autoComplete="current-password"
            withAsterisk
            name="current_password"
            key={form.key("current_password")}
            {...form.getInputProps("current_password")}
          />
          <TextInput
            className={classes.input}
            label="新しいパスワード"
            description="8文字以上"
            type="password"
            autoComplete="new-password"
            withAsterisk
            name="password"
            key={form.key("password")}
            {...form.getInputProps("password")}
          />
          <TextInput
            className={classes.input}
            label="新しいパスワード（確認）"
            type="password"
            autoComplete="new-password"
            withAsterisk
            name="password_confirmation"
            key={form.key("password_confirmation")}
            {...form.getInputProps("password_confirmation")}
          />
          <Button type="submit" disabled={!isReady} loading={change.isPending}>
            変更する
          </Button>
        </Stack>
      </form>
    </section>
  );
}

function LogoutSection() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ email: string }>("/api/me"),
  });

  const logout = useMutation({
    mutationFn: () => apiFetch<void>("/api/logout", { method: "POST" }),
    // 画面を読み込み直して、覚えているレシピのデータも一緒に消す
    onSuccess: () => window.location.assign("/login"),
  });

  return (
    <section className={classes.box}>
      <h2 className={classes.sectionTitle}>ログアウト</h2>
      {me.data && <p className={classes.who}>ログイン中：{me.data.email}</p>}
      <p className={classes.text}>
        共用のパソコンなどでログインしたときは、使い終わったらログアウトしてください。
      </p>
      <Button
        variant="default"
        // 成功のあとも、画面が変わるまで押せないようにする
        loading={logout.isPending || logout.isSuccess}
        onClick={() => logout.mutate()}
      >
        ログアウト
      </Button>
    </section>
  );
}
