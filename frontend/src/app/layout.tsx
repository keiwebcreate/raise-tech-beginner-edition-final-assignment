import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/dates/styles.css";
import "./globals.css";

import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata } from "next";
import { BIZ_UDPGothic, Zen_Maru_Gothic } from "next/font/google";
import { Providers } from "./providers";

// 書体（画面設計書 3.3）。ビルドのときに取り込まれ、外部への通信は増えない
const display = Zen_Maru_Gothic({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});
const body = BIZ_UDPGothic({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Recipe Box",
  description: "自分だけのレシピノート",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      {...mantineHtmlProps}
      className={`${display.variable} ${body.variable}`}
    >
      <head>
        {/* ダークモードは端末の設定に合わせる */}
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
