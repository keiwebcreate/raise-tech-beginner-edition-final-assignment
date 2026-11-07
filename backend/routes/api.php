<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\RecipeController;
use App\Http\Controllers\Api\TagController;
use Illuminate\Support\Facades\Route;

/*
| API の道筋（API 設計書 2章）。URL の頭の /api は Laravel が自動で付ける
| 機能ごとのイシューで、残りの API をここに足していく
| A-01（/sanctum/csrf-cookie）は Sanctum が用意する
*/

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [MeController::class, 'show']);

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/tags', [TagController::class, 'index']);

    Route::get('/recipes', [RecipeController::class, 'index']);
    Route::post('/recipes', [RecipeController::class, 'store']);
    Route::get('/recipes/{recipe}', [RecipeController::class, 'show']);
    // 画面は写真を送るので、POST に _method=PUT を付けて呼ぶ（API 設計書 A-11）
    Route::put('/recipes/{recipe}', [RecipeController::class, 'update']);
    Route::delete('/recipes/{recipe}', [RecipeController::class, 'destroy']);
    Route::post('/recipes/{recipe}/copy', [RecipeController::class, 'copy']);

    Route::put('/recipes/{recipe}/favorite', [FavoriteController::class, 'store']);
    Route::delete('/recipes/{recipe}/favorite', [FavoriteController::class, 'destroy']);
});
