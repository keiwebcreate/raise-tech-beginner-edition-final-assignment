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
| [requirements.md](requirements.md)（要件定義書） | 1.1 | よみがなを追加（2026-11-03） |
| [tech-stack.md](tech-stack.md)（技術スタック） | 1.1 | 確定（2026-11-03） |
| [screen-design.md](screen-design.md)（画面設計書）＋ [mockups/](mockups/index.html) | 1.2 | 見た目を作り直し（#8）、よみがなを追加（#10） |
| [database-design.md](database-design.md)（テーブル設計書） | 1.0 | 確定（2026-11-03） |
| [api-design.md](api-design.md)（API 設計書） | 1.0 | 確定（2026-11-03） |
| [aws-design.md](aws-design.md)（AWS 構成設計書） | 0.1 | ユーザー確認待ち（11章の「新しく決めたこと」も） |

## GitHub の設定

- main はルールセット「main を保護」で保護：PR でのマージだけ許可（承認0人）、強制 push・削除は禁止、例外なし
- マージ方法は Squash and merge だけ。マージしたブランチは自動で消える
- 自動テスト（GitHub Actions）を作ったら、「テストが通らないとマージできない」ルールを足す

## Claude Code の準備（Git には入れていない）

- `.claude/CLAUDE.md`：このプロジェクトの指示書（.gitignore で除外）
- `.claude/skills/frontend-design/`：公式の frontend-design スキル
- claude-security プラグイン：CLI の `claude plugin install claude-security@claude-plugins-official --scope user` で導入済み（VS Code の拡張では `/plugin` が使えない）

## 今の状態（2026-11-03）

- 要件定義が完了（イシュー #1・PR #2）
- 基本設計の前半が完了（イシュー #3）：技術スタック 版1.0、画面設計書 版1.0、モックアップ
- README・.gitignore を追加（イシュー #4・PR #5）
- 見た目を frontend-design スキルで作り直し（イシュー #8・PR #9）
- テーブル設計が完了（イシュー #10）：テーブル設計書 版1.0。よみがなを要件・画面に追加。照合順序の濁点の扱いは詳細設計で MySQL に入れて確かめる
- API 設計が完了（イシュー #12）：API 設計書 版1.0（A-01〜A-18）
- コードはまだない

## 次にやること：基本設計の続き

1. AWS 構成図（EC2・RDS・S3・CloudFront）
2. 詳細設計
