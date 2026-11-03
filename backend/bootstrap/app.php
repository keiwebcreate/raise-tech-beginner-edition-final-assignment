<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum の SPA 認証：画面（Next.js）からの /api の要求を、セッション（クッキー）で確かめる（詳細設計書 4.4）
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // /api への要求には、エラーもいつも JSON で返す（API 設計書 1.3）
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*'));
    })->create();
