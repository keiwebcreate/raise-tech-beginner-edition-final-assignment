<?php

use App\Models\User;

// 環境構築の確認用のテスト。機能のテストができたら消す

it('ログインしていないと /api/me は 401 を返す', function () {
    $this->getJson('/api/me')->assertUnauthorized();
});

it('ログインしていると /api/me はメールアドレスを返す', function () {
    $user = User::factory()->create(['email' => 'owner@example.com']);

    $this->actingAs($user)->getJson('/api/me')
        ->assertOk()
        ->assertExactJson(['email' => 'owner@example.com']);
});
