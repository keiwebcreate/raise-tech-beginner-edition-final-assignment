<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
| API の道筋（API 設計書 2章）。URL の頭の /api は Laravel が自動で付ける
| 機能ごとのイシューで、A-02〜A-18 をここに足していく
*/

Route::middleware('auth:sanctum')->group(function () {
    // A-04 ログイン中の持ち主（環境構築では、ログインなしで 401 になることの確認に使う）
    Route::get('/me', fn (Request $request) => ['email' => $request->user()->email]);
});
