import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { render } from "@/shared/test/render";
import Home from "./page";

// 環境構築の確認用のテスト。レシピ一覧（S-02）を作るときに置き換える
it("アプリ名が表示される", () => {
  render(<Home />);
  expect(
    screen.getByRole("heading", { name: "Recipe Box" }),
  ).toBeInTheDocument();
});
