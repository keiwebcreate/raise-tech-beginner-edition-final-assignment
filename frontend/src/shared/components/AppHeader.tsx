"use client";

import { Burger, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { usePathname } from "next/navigation";
import classes from "./AppHeader.module.css";
import { Logo } from "./Logo";

const NEW_RECIPE_PATH = "/recipes/new";
const SETTINGS_PATH = "/settings";

// 共通のヘッダー（画面設計書 3.2）
export function AppHeader() {
  const [opened, menu] = useDisclosure(false);
  const isSettings = usePathname() === SETTINGS_PATH;
  const settingsCurrent = isSettings ? "page" : undefined;

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
          <Button
            component={Link}
            href={SETTINGS_PATH}
            variant="subtle"
            color="gray"
            aria-current={settingsCurrent}
          >
            設定
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
          <Link
            href={SETTINGS_PATH}
            onClick={menu.close}
            aria-current={settingsCurrent}
          >
            設定
          </Link>
        </nav>
      )}
    </header>
  );
}
