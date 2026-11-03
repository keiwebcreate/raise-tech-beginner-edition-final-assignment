-- テスト用の DB（詳細設計書 3.4・6.2）。開発用の recipe_app とは分ける
CREATE DATABASE IF NOT EXISTS recipe_app_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_ja_0900_as_cs;

GRANT ALL PRIVILEGES ON recipe_app_test.* TO 'recipe_app_user'@'%';
