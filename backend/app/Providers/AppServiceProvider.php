<?php

namespace App\Providers;

use Illuminate\Foundation\Console\ServeCommand;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // php artisan serve は、決まった名前の環境変数だけを中の PHP に渡す。
        // 開発用の DB のパスワード（Windows のユーザー環境変数）も渡すようにする（詳細設計書 3.4）
        ServeCommand::$passthroughVariables[] = 'RECIPE_DB_PASSWORD';
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
