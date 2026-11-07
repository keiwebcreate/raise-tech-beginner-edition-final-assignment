#!/bin/bash
# EC2 の準備（AWS 構成設計書 5.2）。deploy.sh がデプロイのたびに呼ぶ。
# 何度動かしても同じ結果になるように書く
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SHARED=/opt/recipe-app/shared

dnf -y -q install nginx nodejs24 \
  php8.5-cli php8.5-fpm php8.5-common php8.5-gd php8.5-intl php8.5-mbstring \
  php8.5-mysqlnd php8.5-pdo php8.5-xml php8.5-bcmath php8.5-process php8.5-zip

# 版をまたいで使うフォルダ。PHP-FPM のユーザー（apache）が書く
mkdir -p "$SHARED"/storage/app/private "$SHARED"/storage/framework/{cache/data,sessions,views} "$SHARED"/storage/logs
chown -R apache:apache "$SHARED/storage"
chmod 755 /opt/recipe-app "$SHARED"

# RDS の証明書。DB との通信を暗号化し、相手が本当の RDS かを確かめるのに使う
curl -fsSL -o "$SHARED/rds-ca.pem" https://truststore.pki.rds.amazonaws.com/ap-southeast-2/ap-southeast-2-bundle.pem
chmod 644 "$SHARED/rds-ca.pem"

install -m 644 "$HERE/nginx.conf" /etc/nginx/nginx.conf
install -m 644 "$HERE/php.ini" /etc/php.d/99-recipe.ini
install -m 644 "$HERE/recipe-next.service" /etc/systemd/system/recipe-next.service
systemctl daemon-reload

nginx -t -q
systemctl enable --quiet nginx php-fpm recipe-next
