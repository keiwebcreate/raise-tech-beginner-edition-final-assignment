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
| [tech-stack.md](tech-stack.md)（技術スタック） | 1.2 | 確定（2026-11-03） |
| [screen-design.md](screen-design.md)（画面設計書）＋ [mockups/](mockups/index.html) | 1.2 | 見た目を作り直し（#8）、よみがなを追加（#10） |
| [database-design.md](database-design.md)（テーブル設計書） | 1.1 | 照合順序を変更（2026-11-03） |
| [api-design.md](api-design.md)（API 設計書） | 1.0 | 確定（2026-11-03） |
| [aws-design.md](aws-design.md)（AWS 構成設計書） | 1.1 | Node.js 24・照合順序を反映（2026-11-03） |
| [detailed-design.md](detailed-design.md)（詳細設計書） | 1.1 | CI の MySQL の起動方法を追加（2026-11-07） |

## GitHub の設定

- main はルールセット「main を保護」で保護：PR でのマージだけ許可（承認0人）、強制 push・削除は禁止、例外なし
- マージ方法は Squash and merge だけ。マージしたブランチは自動で消える
- 自動テスト（`ci.yml`）のジョブ backend・frontend・e2e の成功も必須（2026-11-07）。ジョブの名前を変えるときは、ルールセットも直す
- `.github/workflows/` を変えた push は、`git -c credential.helper= -c "credential.https://github.com.helper=!gh auth git-credential" push` で送る

## Claude Code の準備（Git には入れていない）

- `.claude/CLAUDE.md`：このプロジェクトの指示書（.gitignore で除外）
- `.claude/skills/frontend-design/`：公式の frontend-design スキル
- claude-security プラグイン：CLI の `claude plugin install claude-security@claude-plugins-official --scope user` で導入済み（VS Code の拡張では `/plugin` が使えない）

## 今の状態（2026-11-07）

- 要件定義が完了（イシュー #1・PR #2）
- 基本設計の前半が完了（イシュー #3）：技術スタック 版1.0、画面設計書 版1.0、モックアップ
- README・.gitignore を追加（イシュー #4・PR #5）
- 見た目を frontend-design スキルで作り直し（イシュー #8・PR #9）
- テーブル設計が完了（イシュー #10）：テーブル設計書 版1.0。よみがなを要件・画面に追加。照合順序の濁点の扱いは詳細設計で MySQL に入れて確かめる
- API 設計が完了（イシュー #12）：API 設計書 版1.0（A-01〜A-18）
- AWS 構成設計が完了（イシュー #14）：AWS 構成設計書 版1.0。**基本設計はこれで全部終わり**
- 詳細設計が完了（イシュー #16）：詳細設計書 版1.0。照合順序を `utf8mb4_ja_0900_as_cs` に、Node.js を 24 に変更（MySQL・Amazon Linux で確かめた結果）
- 環境構築が完了（イシュー #18）：開発用の MySQL、Laravel 13・Next.js 16 のひな形、テストとチェックの道具
- 自動テストが完了（イシュー #20）：`ci.yml`（backend・frontend・e2e）と、main の保護への追加。型チェックは `npm run typecheck` を使う（`next typegen` で Next.js の型を作ってから `tsc` を動かす）
- 使わないひな形のファイルを削除（イシュー #22）：Laravel の画面用のファイル、Next.js の見本の画像、ひな形の README
- 改行を LF に統一（イシュー #24）：ルートの `.gitattributes`。手元でも `npm run lint` が通る
- テーブルとシーダーが完了（イシュー #26）：テーブル7つ・モデル・ファクトリ（テスト用のデータを作る部品）・カテゴリ12個。`DatabaseSeeder` は持ち主を作らない（F-54 のコマンドで作る）

## 開発環境のメモ（詳細設計書 3章・README「開発環境の作り方」）

- PHP は **`php85`** を直接使う。Herd 全体の PHP は 8.1 のまま（ほかのサイト multilogin・umarche が使う）。`herd php` は Herd 側の問題で動かない。Composer は `php85 "%USERPROFILE%\.config\herd\bin\composer.phar"`。PowerShell から `.bat` に `^` を渡すと消えるので、版の指定は `composer.json` を直接書く
- `backend/` は Herd のサイト `recipe-box.test`（PHP 8.5 に固定）として登録済み。使っていないが害はない
- Node.js は fnm。`frontend/.node-version` に 24。fnm の既定は system（前のアプリの Node.js 26）。Claude のシェルでは `fnm exec --using=24 npm.cmd ...`
- DB のパスワードは Windows のユーザー環境変数 `RECIPE_DB_PASSWORD`。前のアプリ用の `DB_PASSWORD`（ユーザー環境変数）があるので、`config/database.php` は `RECIPE_DB_PASSWORD` を先に読む。`php artisan serve` に渡すため `AppServiceProvider` で `ServeCommand::$passthroughVariables` に足した
- Claude は `.env` を読めない（`C:\dev\Raise_Tech\.claude\settings.json` の deny）。`.env.example` は読める
- Claude の権限では `rm`・`Remove-Item` でのファイルの削除ができない。Git で管理しているファイルは `git rm` で消せる
- `frontend/AGENTS.md` は `next dev` が自動で作り直すので、消さない

## 次にやること

1. 機能ごとに実装（イシュー → ブランチ → PR）。おすすめの順：持ち主の作成コマンドとログイン（S-01・F-61）→ レシピの登録・詳細 → 一覧・検索 → 編集・削除・複製 → 写真 → 作った記録 → 設定

## 構築の前に確かめること

- 前のアプリ（beginner_version）で、作業用の IAM ユーザーが組織の制限（SCP）で EC2 などを拒否されていた。同じ AWS アカウントを使うなら、解決しているかを確かめる
