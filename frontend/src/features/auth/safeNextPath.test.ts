import { expect, it } from "vitest";
import { safeNextPath } from "./safeNextPath";

it.each([
  ["/", "/"],
  ["/recipes/1", "/recipes/1"],
  ["/?q=豚肉&page=2", "/?q=%E8%B1%9A%E8%82%89&page=2"],
  ["/recipes/1#steps", "/recipes/1#steps"],
])("自分のサイトの中の URL は、そのまま使う：%s", (next, expected) => {
  expect(safeNextPath(next)).toBe(expected);
});

it.each([
  [undefined],
  [""],
  ["https://evil.example"],
  ["http://evil.example/recipes"],
  ["//evil.example"],
  ["/\\evil.example"],
  ["\\\\evil.example"],
  ["/\t/evil.example"],
  ["/\n/evil.example"],
  ["javascript:alert(1)"],
  ["recipes/1"],
  ["/login"],
])("外のサイトや変な形の URL は、一覧にする：%j", (next) => {
  expect(safeNextPath(next)).toBe("/");
});
