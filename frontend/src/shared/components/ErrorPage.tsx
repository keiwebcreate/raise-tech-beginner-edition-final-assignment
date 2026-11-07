"use client";

import { Button } from "@mantine/core";
import Link from "next/link";
import classes from "./ErrorPage.module.css";

// S-07 エラー（画面設計書 4章）。ヘッダーは呼び出す側の場所で決まる
export function NotFoundContent() {
  return (
    <ErrorContent
      code={404}
      title="ページが見つかりません"
      text="レシピが削除されたか、URL が間違っている可能性があります"
    >
      <Button component={Link} href="/">
        レシピ一覧へ
      </Button>
    </ErrorContent>
  );
}

export function ServerErrorContent() {
  return (
    <ErrorContent
      code={500}
      title="エラーが起きました"
      text="時間をおいて、もう一度お試しください"
    >
      <Button variant="default" onClick={() => window.location.reload()}>
        再読み込み
      </Button>
      <Button component={Link} href="/">
        レシピ一覧へ
      </Button>
    </ErrorContent>
  );
}

function ErrorContent({
  code,
  title,
  text,
  children,
}: {
  code: number;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <main className={classes.container}>
      <section className={classes.sheet}>
        <p className={classes.code}>{code}</p>
        <h1 className={classes.title}>{title}</h1>
        <p className={classes.text}>{text}</p>
        <div className={classes.actions}>{children}</div>
      </section>
    </main>
  );
}
