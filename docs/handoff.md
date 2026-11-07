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
| [aws-design.md](aws-design.md)（AWS 構成設計書） | 1.2 | リージョンをシドニーに変更（2026-11-07） |
| [detailed-design.md](detailed-design.md)（詳細設計書） | 1.7 | 設定の実装に合わせて追記（2026-11-07） |

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
- 持ち主の作成とログインが完了（イシュー #28）：`app:create-owner`、A-02・A-04、`shared/api/client.ts`、S-01、`proxy.ts`。ログアウト（F-52）とパスワード変更（F-53）は「設定」のイシューで作る
- レシピの登録と詳細が完了（イシュー #30）：`TextNormalizer`、A-06・A-07・A-09・A-10、`SaveRecipeAction`、共通のヘッダー、S-03（表示だけ）、S-04、S-07。写真の欄と詳細の操作ボタン、ヘッダーの「設定」はそれぞれのイシューで足す
- レシピ一覧・検索・お気に入りが完了（イシュー #32）：A-08・A-13・A-14、`RecipeQuery`、S-02、★（一覧と詳細）、検索条件と URL の変換、「一覧に戻る」で条件を戻す動き。写真は「写真」のイシューで足す
- レシピの編集・削除・複製が完了（イシュー #34）：A-11・A-12・A-15、`DeleteRecipeAction`・`CopyRecipeAction`、S-05、D-01・D-04、詳細のボタン。
- レシピの完成写真が完了（イシュー #40）：`RecipePhotoStorage`、A-08〜A-12・A-15 の写真、フォームの写真の欄、「No Image」の画像（`NoImage.tsx`、SVG）。本番の S3 の設定は公開のイシューで行う
- 作った記録が完了（イシュー #42）：A-16〜A-18、D-02・D-03、詳細の「作った」ボタンと記録の欄
- 設定が完了（イシュー #44）：A-03・A-05、S-06、ヘッダーの「設定」。**要件の機能はこれで全部**
- AWS 段階1が完了（イシュー #46）：`terraform/`（VPC・サブネット・セキュリティグループ・EC2・固定の IP アドレス・EC2 の役割）。リージョンはシドニー

## 開発環境のメモ（詳細設計書 3章・README「開発環境の作り方」）

- PHP は **`php85`** を直接使う。Herd 全体の PHP は 8.1 のまま（ほかのサイト multilogin・umarche が使う）。`herd php` は Herd 側の問題で動かない。Composer は `php85 "%USERPROFILE%\.config\herd\bin\composer.phar"`。PowerShell から `.bat` に `^` を渡すと消えるので、版の指定は `composer.json` を直接書く
- `backend/` は Herd のサイト `recipe-box.test`（PHP 8.5 に固定）として登録済み。使っていないが害はない
- Node.js は fnm。`frontend/.node-version` に 24。fnm の既定は system（前のアプリの Node.js 26）。Claude のシェルでは `fnm exec --using=24 npm.cmd ...`
- DB のパスワードは Windows のユーザー環境変数 `RECIPE_DB_PASSWORD`。前のアプリ用の `DB_PASSWORD`（ユーザー環境変数）があるので、`config/database.php` は `RECIPE_DB_PASSWORD` を先に読む。`php artisan serve` に渡すため `AppServiceProvider` で `ServeCommand::$passthroughVariables` に足した
- Claude は `.env` を読めない（`C:\dev\Raise_Tech\.claude\settings.json` の deny）。`.env.example` は読める
- Claude の権限では `rm`・`Remove-Item` でのファイルの削除ができない。Git で管理しているファイルは `git rm` で消せる
- `frontend/AGENTS.md` は `next dev` が自動で作り直すので、消さない
- 開発用の DB には、ユーザーの依頼で確認用の持ち主 `owner@example.com` を作った（パスワードは Git に書かない。ユーザーに伝え済み）。アカウントは1つだけなので、`app:create-owner` は断られる
- 開発用の DB には、確認で作ったレシピが入っている（`肉じゃが` など）。消してよい
- 手元に Playwright のブラウザを入れていないので、通しのテストは入っている Chrome で動かす（`node_modules/.cache/pw-local.config.cjs`。Git に入らない。消えたら作り直す）。WebKit・Firefox は CI で確かめる
- 通しのテストを手元で動かすときは、開発用の DB にレシピが増えないよう `recipe_app_test` につなぐ。`$env:DB_DATABASE='recipe_app_test'` のあと `backend/serve.ps1` で起動する（`php85 artisan serve` は環境変数の `DB_DATABASE` を子プロセスに渡さないので使えない）。テストで保存した写真は `backend/storage/app/private/recipes/` に残る（Git に入らない）。Pest を動かすと空になるので、そのあとカテゴリのシーダーとテスト用の持ち主を入れ直す
- `password.spec.ts` は持ち主のパスワードを変えて、最後に元へ戻す。途中で失敗すると変わったままになるので、そのときはテスト用の持ち主を入れ直す
- `claude-security` のスキャンには Workflow ツールが要る。使えないセッションでは `security-review` で見直す

## 次にやること

1. AWS 段階2（RDS・S3・Parameter Store・EC2 の役割。AWS 構成設計書 9章）。下の「構築の前に確かめること」を先に見る

## AWS の今の状態（2026-11-07）

**段階1のものが動いていて、1日あたり約0.7ドルかかる**（設計書の見込みからの計算）。

- シドニーに 16個（VPC・サブネット・EC2・固定の IP アドレスなど）。EC2 は `terraform output` で確かめる
- 作る・変えるときは `terraform/` で `terraform plan` の結果を見せ、ユーザーの OK のあとで `terraform apply` する
- 全部消すときは、ユーザーの OK のあとで `terraform/` で `terraform destroy`。state（`terraform.tfstate`）はパソコンの中だけにあるので、消さない
- EC2 の中では sshd が最初から動いているが、ポート22を開けていないので外から届かない。鍵も登録していない
- `aws ssm send-command` の `--parameters` は、PowerShell からは JSON ファイル（`file://`）で渡す。直接書くと引用符が壊れる
- PowerShell から `terraform plan -out=...` を動かすときは、`"-out=..."` と引用符で囲む

## 構築の前に確かめること

- 写真を 5MB まで送れるよう、本番の PHP に `upload_max_filesize=6M`・`post_max_size=8M`、Nginx に `client_max_body_size 8m` を設定する。PHP の拡張機能 `exif`（写真の向きの補正）も入れる

- `proxy.ts` はログイン中の応答にもセッションのクッキーを付ける。CloudFront が HTML を保存すると他人に配られるので、`/_next/static/*` 以外を保存しない設定（AWS 構成設計書 5.1）になっているかを確かめる
- AWS は**絶対に東京にしない**。組織の制限（SCP）で、シドニー（`ap-southeast-2`）以外の EC2 などは拒否される（2026-11-07 に確認）
- 同じ制限で GitHub の OIDC が作れない見込み。段階3の前に、デプロイの認証の方法を決める（AWS 構成設計書 6章）
