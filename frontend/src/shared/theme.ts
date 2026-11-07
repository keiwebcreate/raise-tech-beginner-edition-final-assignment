import {
  type CSSVariablesResolver,
  createTheme,
  type MantineColorsTuple,
} from "@mantine/core";

// 蜜柑（みかん）：主な色。6番が #F08300（画面設計書 3.3）
const mikan: MantineColorsTuple = [
  "#fff4e2",
  "#ffe8cc",
  "#ffd09a",
  "#ffb664",
  "#ffa037",
  "#ff9218",
  "#f08300",
  "#d67300",
  "#bf6500",
  "#a55500",
];

// ダークモードの色（画面設計書 3.3）。Mantine はこの番号の色を決まった所に使う
const dark: MantineColorsTuple = [
  "#e6e9e4", // 0：文字（藍墨）
  "#c5cac1",
  "#a3adb3", // 2：補足の文字
  "#7a868e",
  "#46535e", // 4：入力欄の枠
  "#34404a", // 5：区切りの線
  "#222b32", // 6：入力欄（紙）
  "#1b2228", // 7：背景（まな板）
  "#161c21",
  "#101519",
];

// 入力の誤りの赤（画面設計書 3.3）
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: { "--mantine-color-error": "#c4392d" },
  dark: { "--mantine-color-error": "#f07167" },
});

export const theme = createTheme({
  primaryColor: "mikan",
  primaryShade: { light: 6, dark: 6 },
  colors: { mikan, dark },
  // 文字の色は藍墨（あいずみ）。蜜柑のボタンの上の文字も、自動でこの色になる
  black: "#25323c",
  autoContrast: true,
  fontFamily:
    "var(--font-body), 'Hiragino Sans', 'Yu Gothic UI', Meiryo, sans-serif",
  headings: {
    fontFamily: "var(--font-display), 'Hiragino Maru Gothic ProN', sans-serif",
    fontWeight: "700",
  },
  defaultRadius: "sm",
});
