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
| [tech-stack.md](tech-stack.md)（技術スタック） | 1.0 | 確定（2026-11-03） |
| [screen-design.md](screen-design.md)（画面設計書）＋ [mockups/](mockups/index.html) | 0.1 | ユーザー確認待ち（6章の「新しく決めたこと」も含めて） |

## GitHub の設定

- main はルールセット「main を保護」で保護：PR でのマージだけ許可（承認0人）、強制 push・削除は禁止、例外なし
- 自動テスト（GitHub Actions）を作ったら、「テストが通らないとマージできない」ルールを足す

## 今の状態（2026-11-03）

- 要件定義が完了（イシュー #1・PR #2、マージ済み）
- 基本設計の前半（イシュー #3、ブランチ docs/3-basic-design-screens）：技術スタックを確定、画面設計書とモックアップを作成。**ユーザーの確認待ち**
- コードはまだない

## 次にやること：基本設計の続き

1. 画面設計書・モックアップをユーザーに見てもらい、直して版1.0に → PR（イシュー #3）
2. テーブル設計（ER図）
3. API 設計
4. AWS 構成図（EC2・RDS・S3・CloudFront）
