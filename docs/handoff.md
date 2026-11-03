# 引き継ぎメモ

チャットをまたぐときは、ここを読んでから再開する。

## 進め方

- 要件定義 → 基本設計 → 詳細設計 → 環境構築 → 実装・テスト → デプロイ の順に進める
- 決めることは、質問形式で1つずつ決める
- 作業は「イシュー → ブランチ → PR」の流れで進める。マージはユーザーが行う
- GitHub：https://github.com/keiwebcreate/raise-tech-beginner-edition-final-assignment （提出物はこのリポジトリの URL）

## 文書

| 文書 | 版 | 状態 |
|---|---|---|
| [requirements.md](requirements.md)（要件定義書） | 1.0 | 確定（2026-11-03） |
| [tech-stack.md](tech-stack.md)（技術スタック） | 0.3 | TypeScript・Mantine＋CSS Modules まで決定 |

## 今の状態（2026-11-03）

- 要件定義が完了（イシュー #1）
- コードはまだない

## 次にやること：基本設計

1. 技術スタックの残り（tech-stack.md 3章）：ログインの方式、テストの道具、HTTPS の付け方
2. 画面設計（画面一覧・画面遷移・モックアップ）
3. テーブル設計（ER図）
4. API 設計
5. AWS 構成図（EC2・RDS・S3）
