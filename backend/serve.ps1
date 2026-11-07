# 開発用に Laravel を 8000 番で起動する。
# PHP の初期設定はアップロードが 2MB までで、要件（5MB まで）の写真を送れない。
# php artisan serve には設定を渡せないので、PHP の内蔵サーバーを直接動かす
Set-Location (Join-Path $PSScriptRoot 'public')
php85 -d upload_max_filesize=6M -d post_max_size=8M -S 127.0.0.1:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
