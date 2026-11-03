# 技術スタック：レシピ管理アプリ

| 項目 | 内容 |
|---|---|
| 版 | 1.2 |
| 作成日 | 2026-11-03 |
| バージョンの確認日 | 2026-11-03 |

要件定義書（[requirements.md](requirements.md)）の「6. 制約」から参照する。バージョンは確認日時点の最新の安定版。実際に入れるときに改めて確かめ、変わっていればこの文書を直す。

---

## 1. 選び方の決まり

- 課題の条件により、初級編で使った技術（React+TypeScript+Vite+Tailwind CSS、Java+Spring Boot+Gradle+PostgreSQL）とは**違うもの**を主に使う
- 長く安全に使えるよう、**サポート期間が長い版（LTS など）の最新**を選ぶ
- 開発（自分のパソコン）と本番（AWS）で**同じ版**をそろえる。版の違いによる「手元では動くのに本番で動かない」を防ぐため

---

## 2. 一覧

### 2.1 画面（フロントエンド）

| 技術 | 役割 | バージョン | 補足 |
|---|---|---|---|
| Next.js | 画面を作る枠組み（フレームワーク） | 16.4 系（16.4.4） | 本番では Node.js のサーバーとして動かす（3章） |
| React | Next.js の土台になる部品の仕組み | 19.3 系（19.3.1） | Next.js と一緒に入る。初級編でも使ったが、Next.js の一部として使うので条件には反しない |
| Node.js | Next.js を動かす実行環境 | **24 系 LTS**（24.22.2） | 長期サポート版。サポートは 2028-04-30 まで。Amazon Linux 2023 に 26 がまだないため、開発と本番をそろえて 24 にした（詳細設計書 2.2）。パソコンは fnm で切り替える |
| TanStack Query | API から取ってきたデータの係（キャッシュ・取り直し） | 5 系（5.105.3） | 詳細設計書 5.5 |
| @dnd-kit/react | 材料・手順の並び替え（ドラッグ＆ドロップ） | 0.5 系（0.5.3） | 1.0 前の版。詳細設計書 5.2 |
| Biome | 画面のコードの書き方のそろえとチェック | 2.6 系（2.6.4） | |
| TypeScript | 型のある JavaScript。入力の間違いを書いている段階で見つけられる | 7.0 系（7.0.2） | 言語なので、初級編と同じでも条件には反しないと判断 |
| Mantine | 画面の部品集（ボタン・入力欄・タグ入力・ページ分け・確認ダイアログ・通知など） | 9.7 系（9.7.4） | 見た目の土台にする。React 19.2 以上に対応。写真のドラッグ＆ドロップは @mantine/dropzone、日付の選択は @mantine/dates、通知は @mantine/notifications（いずれも 9.7.4）を使う予定 |
| CSS Modules | Mantine の見た目の調整、独自の部品のデザイン | Next.js に最初から入っている | クラス名が画面どうしでぶつからない、ふつうの CSS。Tailwind CSS は使わない |

### 2.2 サーバー（バックエンド）

| 技術 | 役割 | バージョン | 補足 |
|---|---|---|---|
| PHP | Laravel を動かす言語 | 8.5 系（8.5.12） | セキュリティ修正は 2029-12-31 まで。Laravel 13 は PHP 8.3 以上が必要 |
| Laravel | サーバー側の枠組み（フレームワーク） | 13 系（13.39.0） | セキュリティ修正は 2028-03-17 まで。画面は作らず、API だけを受け持つ |
| Laravel Sanctum | ログインの仕組み | 4.3 系（v4.3.3） | 「SPA 認証」を使う。ログインするとクッキー（ログインの証明）をブラウザに渡し、以後はブラウザが自動で送る。クッキーは JavaScript から読めない設定にする。「ログイン状態を保持」に対応 |
| Composer | PHP の部品（ライブラリ）を入れる道具 | 2.11 系（2.11.1） | パソコンでは Laravel Herd に入っているものを使う |
| Laravel Herd | パソコンで PHP 8.5 と Composer を動かす道具（Laravel 公式） | 最新 | 詳細設計書 3.1 |
| Intervention Image | 写真の縮小と WebP への変換 | 4 系（4.4.1） | PHP の `gd` を使う |
| Laravel Pint・Larastan | サーバーのコードの書き方のそろえ・型のチェック | 1.32・3.14 | |

### 2.3 データベース

| 技術 | 役割 | バージョン | 補足 |
|---|---|---|---|
| MySQL | データベース | **8.4 系**（LTS） | AWS RDS で本番に使えるのは 8.4 系まで（9.7 はまだ試用環境のみ）。開発の Docker も 8.4 にそろえる。RDS の最新は 8.4.11、配布元の最新は 8.4.13 |

### 2.4 AWS（本番環境）

| サービス | 役割 | 補足 |
|---|---|---|
| CloudFront | 入口。HTTPS を受け持ち、EC2 へ中継する | 独自ドメインは使わず、`xxxx.cloudfront.net` の URL で HTTPS にする。ほぼ無料（無料枠の範囲） |
| EC2 | アプリを動かすサーバー | OS は Amazon Linux 2023（サポートは 2029-06-30 まで） |
| Nginx | EC2 の中の入口。画面と API への振り分け | 1.30 系（安定版）を目安。Amazon Linux 2023 で入れられる版を使う |
| RDS | MySQL を動かす | MySQL 8.4 系。自動バックアップ7日分 |
| S3 | 写真の保存先、デプロイするファイルの置き場所 | どちらも公開しない |
| Systems Manager | EC2 へのログイン（Session Manager）、デプロイの命令（Run Command）、秘密の情報の保存（Parameter Store） | SSH は使わない。詳しくは [AWS 構成設計書](aws-design.md) |
| Terraform | AWS の部品を、ファイルに書いて作る・消す | 版は環境構築のときに最新を調べる |

### 2.5 テスト

| 種類 | 道具 | バージョン | 何を確かめるか |
|---|---|---|---|
| サーバー側 | Pest | v5.3.5 | API が正しく動くか（ログインなしで断られる、入力の誤りで断られる、など）。Laravel が標準として勧めている |
| 画面側 | Vitest ＋ React Testing Library | 5.1.0 ／ 16.3.3 | 部品ひとつひとつの動き（材料の行の追加など） |
| 通しのテスト（E2E） | Playwright | 1.64.1 | 実際のブラウザで、ログイン → 登録 → 一覧など主な流れだけ。Chrome・Firefox・Safari 系で動かし、対応ブラウザ（N-02）の確認にも使う |

いずれも GitHub に送ったとき、GitHub Actions で自動実行する（N-33）。

### 2.6 開発の道具

| 技術 | 役割 | 補足 |
|---|---|---|
| Docker | 開発用の MySQL を動かす | 3306番は別のプロジェクトが使っているので、別の番号にする |
| Git・GitHub | ソースの管理。提出物はリポジトリの URL | |
| GitHub Actions | GitHub に送ったときの自動テスト。本番用のビルド（公開用の変換）もここで行う | 小さな EC2 ではビルドのメモリが足りなくなるおそれがあるため |

---

## 3. 本番の構成

```
ブラウザ
  │ HTTPS
  ▼
CloudFront
  │
  ▼
EC2（Amazon Linux 2023）
  └ Nginx ─┬─ /            → Next.js（Node.js のサーバー）
           └─ /api・/sanctum → Laravel（PHP）──┬→ RDS（MySQL 8.4）
                                               └→ S3（写真）
```

- 画面（Next.js）と API（Laravel）を**同じドメイン**で配る。Sanctum の SPA 認証は、同じドメインであることが前提のため
- Next.js は HTML ファイルに書き出す形（静的エクスポート）ではなく、Node.js のサーバーとして動かす。`/recipes/12` のような URL をそのまま使え、ログインしていない人を画面を出す前にログイン画面へ移せる（F-61）
- 詳しい構成図（ネットワーク、通信の許可、権限、デプロイの流れ）は [AWS 構成設計書](aws-design.md)

---

## 4. 参考（バージョンの確認元）

- [endoflife.date](https://endoflife.date/)（各技術のリリースとサポート期限の一覧）
- [MySQL on Amazon RDS versions（AWS 公式）](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html)
- [Amazon RDS for MySQL supports MySQL 9.7 in Amazon RDS Database Preview Environment（AWS 公式）](https://aws.amazon.com/about-aws/whats-new/2026/07/amazon-rds-mysql-long-term-9-7-rds-database-preview/)
- npm（TypeScript・Next.js・React・Mantine・Vitest・React Testing Library・Playwright の最新版）
- Packagist（Laravel Sanctum・Pest の最新版）

---

## 5. 改訂履歴

| 版 | 日付 | 内容 |
|---|---|---|
| 0.1 | 2026-11-03 | 作成 |
| 0.2 | 2026-11-03 | TypeScript を使うことに決定 |
| 0.3 | 2026-11-03 | 見た目は Mantine を土台にし、調整は CSS Modules で行うことに決定 |
| 1.0 | 2026-11-03 | ログイン（Sanctum の SPA 認証）、テストの道具、HTTPS（CloudFront）、Next.js の動かし方を決め、本番の構成（3章）を追加。未決定の項目がなくなったので確定 |
| 1.1 | 2026-11-03 | AWS 構成設計に合わせ、Systems Manager と Terraform を 2.4 に追加 |
| 1.2 | 2026-11-03 | 詳細設計に合わせ、Node.js を 24 に変更。TanStack Query・@dnd-kit/react・Biome・Laravel Herd・Intervention Image・Pint・Larastan を追加 |
