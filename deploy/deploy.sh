#!/bin/bash
# EC2 で動くデプロイの手順（詳細設計書 7.3）。広げた版のフォルダの中から root で動かす。
# この出力は公開の GitHub Actions のログに載るので、秘密の情報を出さない（set -x を使わない）
set -euo pipefail

export AWS_DEFAULT_REGION=ap-southeast-2 AWS_PAGER=''

APP=/opt/recipe-app
SHARED="$APP/shared"
RELEASE="$(cd "$(dirname "$0")/.." && pwd)"
PARAMETER_PATH=/recipe-app/prod

artisan() {
  (cd "$RELEASE/backend" && runuser -u apache -- php artisan "$@")
}

echo "== 1. EC2 の準備"
bash "$RELEASE/deploy/setup.sh"

echo "== 2. 設定ファイルを作る"
# Parameter Store の値は、名前の最後をそのまま環境変数の名前にする
ENV_TMP="$(mktemp "$SHARED/.env.XXXXXX")"
chmod 640 "$ENV_TMP"
{
  cat <<EOF
APP_NAME="Recipe Box"
APP_ENV=production
APP_DEBUG=false
APP_LOCALE=ja
APP_FALLBACK_LOCALE=en
BCRYPT_ROUNDS=12
LOG_CHANNEL=stack
LOG_STACK=daily
LOG_DAILY_DAYS=14
LOG_LEVEL=info
DB_CONNECTION=mysql
DB_CHARSET=utf8mb4
DB_COLLATION=utf8mb4_ja_0900_as_cs
MYSQL_ATTR_SSL_CA=$SHARED/rds-ca.pem
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=s3
QUEUE_CONNECTION=sync
CACHE_STORE=database
MAIL_MAILER=log
EOF
  aws ssm get-parameters-by-path --path "$PARAMETER_PATH" --with-decryption \
    --query 'Parameters[].[Name,Value]' --output text |
    awk -F'\t' '{ n = split($1, part, "/"); printf "%s=\"%s\"\n", part[n], $2 }'
} >"$ENV_TMP"
chown root:apache "$ENV_TMP"
mv -f "$ENV_TMP" "$SHARED/.env"

# Next.js の proxy.ts が読む設定
APP_URL="$(aws ssm get-parameter --name "$PARAMETER_PATH/APP_URL" --with-decryption --query Parameter.Value --output text)"
printf 'API_ORIGIN=http://127.0.0.1:8081\nAPP_URL=%s\n' "$APP_URL" >"$SHARED/next.env"
chmod 640 "$SHARED/next.env"

echo "== 3. 版のフォルダをつなぐ"
rm -rf "$RELEASE/backend/storage"
ln -sfn "$SHARED/storage" "$RELEASE/backend/storage"
ln -sfn "$SHARED/.env" "$RELEASE/backend/.env"
chown -R apache:apache "$RELEASE/backend/bootstrap/cache"

echo "== 4. 設定を速く読めるようにし、DB を変更する"
artisan config:cache --no-interaction
artisan route:cache --no-interaction
artisan migrate --force --no-interaction
artisan db:seed --class=CategorySeeder --force --no-interaction

echo "== 5. 新しい版に切り替える"
PREVIOUS="$(readlink -f "$APP/current" || true)"

switch_to() {
  ln -sfn "$1" "$APP/current.new"
  mv -T "$APP/current.new" "$APP/current"
  systemctl restart php-fpm recipe-next
  systemctl reload-or-restart nginx
}

# 待ちながら、決まった応答が返るかを確かめる
expect_status() {
  local expected="$1" url="$2" status=""
  for _ in $(seq 1 15); do
    status="$(curl -s -o /dev/null -w '%{http_code}' -H 'Accept: application/json' "$url" || true)"
    [ "$status" = "$expected" ] && return 0
    sleep 2
  done
  echo "$url は $expected ではなく $status を返しました" >&2
  return 1
}

switch_to "$RELEASE"

echo "== 6. 動いていることを確かめる"
if ! { expect_status 401 http://127.0.0.1:8081/api/me &&
  expect_status 401 http://127.0.0.1/api/me &&
  expect_status 200 http://127.0.0.1/login &&
  expect_status 307 http://127.0.0.1/; }; then
  if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ] && [ "$PREVIOUS" != "$RELEASE" ]; then
    echo "失敗したので、前の版に戻します" >&2
    switch_to "$PREVIOUS"
  fi
  exit 1
fi

echo "== 7. 古い版を片付ける（新しいものを3つ残す）"
ls -1dt "$APP"/releases/*/ | tail -n +4 | while read -r old; do
  [ "$(readlink -f "$old")" = "$(readlink -f "$APP/current")" ] || rm -rf "$old"
done

echo "デプロイが完了しました"
