<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;

// ログイン（A-02・A-04、N-23・N-24）

// Sanctum は Referer を見て、画面からの要求だと判断する
function loginFromFrontend($test, array $data)
{
    return $test->withHeader('Referer', 'http://localhost:3000/login')->postJson('/api/login', $data);
}

beforeEach(function () {
    $this->owner = User::factory()->create([
        'email' => 'owner@example.com',
        'password' => 'correct-password',
    ]);
});

it('正しいメールアドレスとパスワードでログインでき、204 を返す', function () {
    loginFromFrontend($this, ['email' => 'owner@example.com', 'password' => 'correct-password'])
        ->assertNoContent();

    $this->assertAuthenticatedAs($this->owner, 'web');
});

it('「ログイン状態を保持する」なら記憶のクッキーを出す', function () {
    $response = loginFromFrontend($this, [
        'email' => 'owner@example.com',
        'password' => 'correct-password',
        'remember' => true,
    ]);

    $response->assertCookie(Auth::guard('web')->getRecallerName());
});

it('保持しないなら記憶のクッキーを出さない', function () {
    $response = loginFromFrontend($this, [
        'email' => 'owner@example.com',
        'password' => 'correct-password',
        'remember' => false,
    ]);

    $response->assertCookieMissing(Auth::guard('web')->getRecallerName());
});

it('パスワードが違っても、メールアドレスが違っても、同じ返事をする', function (string $email, string $password) {
    loginFromFrontend($this, ['email' => $email, 'password' => $password])
        ->assertUnprocessable()
        ->assertExactJson(['message' => 'メールアドレスかパスワードが違います']);

    $this->assertGuest('web');
})->with([
    'パスワードが違う' => ['owner@example.com', 'wrong-password'],
    'メールアドレスが違う' => ['other@example.com', 'correct-password'],
]);

it('入力に誤りがあれば、項目ごとに日本語で返す', function () {
    loginFromFrontend($this, ['email' => 'owner', 'password' => ''])
        ->assertUnprocessable()
        ->assertExactJson([
            'message' => '入力に誤りがあります',
            'errors' => [
                'email' => ['メールアドレスの形が正しくありません'],
                'password' => ['パスワードを入力してください'],
            ],
        ]);
});

it('画面以外からのログインは、パスワードが正しくても断る', function () {
    $this->postJson('/api/login', ['email' => 'owner@example.com', 'password' => 'correct-password'])
        ->assertForbidden();

    $this->assertGuest('web');
});

it('失敗が1分に5回を超えると 429 になり、正しいパスワードでも入れない', function () {
    foreach (range(1, 5) as $i) {
        loginFromFrontend($this, ['email' => 'owner@example.com', 'password' => 'wrong-password'])
            ->assertUnprocessable();
    }

    loginFromFrontend($this, ['email' => 'owner@example.com', 'password' => 'correct-password'])
        ->assertTooManyRequests()
        ->assertExactJson(['message' => 'しばらく受け付けません。1分後にもう一度お試しください']);

    $this->assertGuest('web');
});

it('回数制限はメールアドレスの大文字と小文字を区別せずに数える', function () {
    foreach (range(1, 5) as $i) {
        loginFromFrontend($this, ['email' => 'OWNER@example.com', 'password' => 'wrong-password']);
    }

    loginFromFrontend($this, ['email' => 'owner@example.com', 'password' => 'wrong-password'])
        ->assertTooManyRequests();
});

it('1分たつと、またログインできる', function () {
    foreach (range(1, 5) as $i) {
        loginFromFrontend($this, ['email' => 'owner@example.com', 'password' => 'wrong-password']);
    }

    $this->travel(61)->seconds();

    loginFromFrontend($this, ['email' => 'owner@example.com', 'password' => 'correct-password'])
        ->assertNoContent();
});

it('ログインに成功すると、失敗の回数は数え直しになる', function () {
    foreach (range(1, 4) as $i) {
        loginFromFrontend($this, ['email' => 'owner@example.com', 'password' => 'wrong-password']);
    }
    loginFromFrontend($this, ['email' => 'owner@example.com', 'password' => 'correct-password'])
        ->assertNoContent();
    Auth::guard('web')->logout();

    foreach (range(1, 5) as $i) {
        loginFromFrontend($this, ['email' => 'owner@example.com', 'password' => 'wrong-password'])
            ->assertUnprocessable();
    }
});

it('ログインしていないと /api/me は 401 を日本語で返す', function () {
    $this->getJson('/api/me')
        ->assertUnauthorized()
        ->assertExactJson(['message' => 'ログインしてください']);
});

it('ログインしていると /api/me はメールアドレスだけを返す', function () {
    $this->actingAs($this->owner)->getJson('/api/me')
        ->assertOk()
        ->assertExactJson(['email' => 'owner@example.com']);
});

it('ない API は 404 を日本語で返す', function () {
    $this->getJson('/api/nothing')
        ->assertNotFound()
        ->assertExactJson(['message' => '見つかりません']);
});
