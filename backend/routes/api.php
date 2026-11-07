<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MeController;
use Illuminate\Support\Facades\Route;

/*
| API の道筋（API 設計書 2章）。URL の頭の /api は Laravel が自動で付ける
| 機能ごとのイシューで、A-03・A-05〜A-18 をここに足していく
| A-01（/sanctum/csrf-cookie）は Sanctum が用意する
*/

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [MeController::class, 'show']);
});
