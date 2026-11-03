# 技術スタック：レシピ管理アプリ

| 項目 | 内容 |
|---|---|
| 版 | 0.3 |
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
| Next.js | 画面を作る枠組み（フレームワーク） | 16.4 系（16.4.4） | |
| React | Next.js の土台になる部品の仕組み | 19.3 系（19.3.1） | Next.js と一緒に入る。初級編でも使ったが、Next.js の一部として使うので条件には反しない |
| Node.js | Next.js を動かす実行環境 | 26 系 LTS（26.13.0） | 2026-10-28 に LTS（長期サポート版）になった。サポートは 2029-04-30 まで |
| TypeScript | 型のある JavaScript。入力の間違いを書いている段階で見つけられる | 7.0 系（7.0.2） | 使う（2026-11-03 決定）。言語なので、初級編と同じでも条件には反しないと判断 |
| Mantine | 画面の部品集（ボタン・入力欄・タグ入力・ページ分け・確認ダイアログなど） | 9.7 系（9.7.4） | 見た目の土台にする（2026-11-03 決定）。React 19.2 以上に対応。写真のドラッグ＆ドロップは @mantine/dropzone、日付の選択は @mantine/dates（どちらも 9.7.4）を使う予定 |
| CSS Modules | Mantine の見た目の調整、独自の部品のデザイン | Next.js に最初から入っている | クラス名が画面どうしでぶつからない、ふつうの CSS。Tailwind CSS は使わない |

### 2.2 サーバー（バックエンド）

| 技術 | 役割 | バージョン | 補足 |
|---|---|---|---|
| PHP | Laravel を動かす言語 | 8.5 系（8.5.12） | セキュリティ修正は 2029-12-31 まで。Laravel 13 は PHP 8.3 以上が必要 |
| Laravel | サーバー側の枠組み（フレームワーク） | 13 系（13.39.0） | セキュリティ修正は 2028-03-17 まで |
| Composer | PHP の部品（ライブラリ）を入れる道具 | 2.11 系（2.11.1） | |

### 2.3 データベース

| 技術 | 役割 | バージョン | 補足 |
|---|---|---|---|
| MySQL | データベース | **8.4 系**（LTS） | AWS RDS で本番に使えるのは 8.4 系まで（9.7 はまだ試用環境のみ）。開発の Docker も 8.4 にそろえる。RDS の最新は 8.4.11、配布元の最新は 8.4.13 |

### 2.4 AWS（本番環境）

| サービス | 役割 | 補足 |
|---|---|---|
| EC2 | アプリを動かすサーバー | OS は Amazon Linux 2023（サポートは 2029-06-30 まで） |
| RDS | MySQL を動かす | MySQL 8.4 系 |
| S3 | 写真の保存先 | |
| Nginx | EC2 の入口。画面と API への振り分け | 1.30 系（安定版）を目安。Amazon Linux 2023 で入れられる版を使う |

HTTPS の付け方（CloudFront など）や、画面と API の分け方は基本設計で決める。

### 2.5 開発の道具

| 技術 | 役割 | 補足 |
|---|---|---|
| Docker | 開発用の MySQL を動かす | 3306番は別のプロジェクトが使っているので、別の番号にする |
| Git・GitHub | ソースの管理。提出物はリポジトリの URL | |
| GitHub Actions | GitHub に送ったときの自動テスト | |

---

## 3. まだ決めていないもの（基本設計で決める）

| 項目 | 内容 |
|---|---|
| ログインの方式 | Laravel の仕組み（Sanctum など）のどれを使うか |
| テストの道具 | サーバー側・画面側それぞれ |
| HTTPS の付け方 | CloudFront、ロードバランサーなど |

---

## 4. 参考（バージョンの確認元）

- [endoflife.date](https://endoflife.date/)（各技術のリリースとサポート期限の一覧）
- [MySQL on Amazon RDS versions（AWS 公式）](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html)
- [Amazon RDS for MySQL supports MySQL 9.7 in Amazon RDS Database Preview Environment（AWS 公式）](https://aws.amazon.com/about-aws/whats-new/2026/07/amazon-rds-mysql-long-term-9-7-rds-database-preview/)
- npm（TypeScript・Next.js・React の最新版）

---

## 5. 改訂履歴

| 版 | 日付 | 内容 |
|---|---|---|
| 0.1 | 2026-11-03 | 作成 |
| 0.2 | 2026-11-03 | TypeScript を使うことに決定 |
| 0.3 | 2026-11-03 | 見た目は Mantine を土台にし、調整は CSS Modules で行うことに決定 |
