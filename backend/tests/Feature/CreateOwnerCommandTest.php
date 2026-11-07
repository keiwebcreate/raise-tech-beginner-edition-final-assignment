<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

// 持ち主の作成コマンド（要件 F-54・N-22）

function runCreateOwner($test, string $email, string $password, ?string $confirmation = null)
{
    return $test->artisan('app:create-owner')
        ->expectsQuestion('メールアドレス', $email)
        ->expectsQuestion('パスワード（8文字以上）', $password)
        ->expectsQuestion('パスワード（もう一度）', $confirmation ?? $password);
}

it('持ち主を作り、パスワードはハッシュで保存する', function () {
    runCreateOwner($this, 'owner@example.com', 'correct-password')->assertSuccessful();

    $user = User::sole();

    expect($user->email)->toBe('owner@example.com')
        ->and($user->password)->not->toBe('correct-password')
        ->and(Hash::check('correct-password', $user->password))->toBeTrue();
});

it('すでに持ち主がいれば断り、増やさない', function () {
    User::factory()->create();

    $this->artisan('app:create-owner')->assertFailed();

    $this->assertDatabaseCount('users', 1);
});

it('入力に誤りがあれば、日本語で知らせて作らない', function (string $email, string $password, string $confirmation, string $message) {
    runCreateOwner($this, $email, $password, $confirmation)
        ->expectsOutput($message)
        ->assertFailed();

    $this->assertDatabaseCount('users', 0);
})->with([
    'メールアドレスの形' => ['owner', 'correct-password', 'correct-password', 'メールアドレスの形が正しくありません'],
    '短いパスワード' => ['owner@example.com', 'short', 'short', 'パスワードは8文字以上にしてください'],
    '確認用と違う' => ['owner@example.com', 'correct-password', 'other-password', 'パスワードが確認用と一致しません'],
]);
