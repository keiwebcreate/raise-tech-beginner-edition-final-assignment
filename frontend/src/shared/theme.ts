import { createTheme, type MantineColorsTuple } from "@mantine/core";

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

export const theme = createTheme({
  primaryColor: "mikan",
  primaryShade: { light: 6, dark: 6 },
  colors: { mikan },
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
