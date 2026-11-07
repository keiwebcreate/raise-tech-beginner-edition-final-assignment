"use client";

import { Burger, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import classes from "./AppHeader.module.css";
import { Logo } from "./Logo";

const NEW_RECIPE_PATH = "/recipes/new";

// 共通のヘッダー（画面設計書 3.2）。「設定」は設定画面ができたら足す
export function AppHeader() {
  const [opened, menu] = useDisclosure(false);

  return (
    <header className={classes.header}>
      <div className={classes.inner}>
        <Link href="/" className={classes.logo} onClick={menu.close}>
          <Logo />
        </Link>
        <nav className={classes.nav}>
          <Button component={Link} href={NEW_RECIPE_PATH}>
            ＋ レシピを追加
          </Button>
        </nav>
        <Burger
          className={classes.burger}
          opened={opened}
          onClick={menu.toggle}
          aria-label="メニュー"
          aria-expanded={opened}
        />
      </div>
      {opened && (
        <nav className={classes.mobileMenu}>
          <Link href={NEW_RECIPE_PATH} onClick={menu.close}>
            ＋ レシピを追加
          </Link>
        </nav>
      )}
    </header>
  );
}
