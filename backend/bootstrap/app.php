<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

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

        // エラーの文言を日本語にそろえる（API 設計書 1.3）
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return $response;
            }

            if ($e instanceof ValidationException) {
                return response()->json([
                    'message' => '入力に誤りがあります',
                    'errors' => $e->errors(),
                ], $e->status);
            }

            $status = $response->getStatusCode();
            $message = match (true) {
                $status === 401 => 'ログインしてください',
                $status === 404 => '見つかりません',
                $status === 419 => 'ページの有効期限が切れました。もう一度お試しください',
                $status === 429 => 'しばらく受け付けません。1分後にもう一度お試しください',
                // 開発中は原因が見えるように、Laravel の表示のままにする。本番では中身を出さない
                $status >= 500 && ! config('app.debug') => 'エラーが起きました',
                default => null,
            };

            return $message === null ? $response : response()->json(['message' => $message], $status);
        });
    })->create();
