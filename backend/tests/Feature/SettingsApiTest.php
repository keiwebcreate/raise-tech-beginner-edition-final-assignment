<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

// ログアウトとパスワード変更（A-03・A-05、F-52・F-53）

const OLD_PASSWORD = 'correct-password';
const NEW_PASSWORD = 'brand-new-password';

// 1つのブラウザからの要求にする。クッキーだけを持ち越し、ほかの記憶はテストの中でも消す
function fromBrowser(TestCase $test, array $cookies = []): TestCase
{
    Auth::forgetGuards();
    Auth::shouldUse('web');
    app('session')->forgetDrivers();
    app()->forgetInstance('session.store');
    (fn () => $this->defaultCookies = $cookies)->call($test);

    return $test->withCredentials()->withHeader('Referer', 'http://localhost:3000/settings');
}

// 応答が渡したクッキーのうち、セッションと記憶のものを取り出す
function sessionCookies(TestResponse $response): array
{
    $cookies = [];
    foreach ([config('session.cookie'), Auth::guard('web')->getRecallerName()] as $name) {
        $cookie = $response->getCookie($name);
        if ($cookie !== null && ! $cookie->isCleared()) {
            $cookies[$name] = $cookie->getValue();
        }
    }

    return $cookies;
}

function loginAs(TestCase $test, bool $remember = false): array
{
    $response = fromBrowser($test)->postJson('/api/login', [
        'email' => 'owner@example.com',
        'password' => OLD_PASSWORD,
        'remember' => $remember,
    ])->assertNoContent();

    return sessionCookies($response);
}

function changePassword(TestCase $test, array $cookies): TestResponse
{
    return fromBrowser($test, $cookies)->putJson('/api/me/password', [
        'current_password' => OLD_PASSWORD,
        'password' => NEW_PASSWORD,
        'password_confirmation' => NEW_PASSWORD,
    ]);
}

beforeEach(function () {
    // 2つのブラウザを別々に確かめるため、本番と同じく DB にセッションを置く
    config(['session.driver' => 'database']);

    $this->owner = User::factory()->create([
        'email' => 'owner@example.com',
        'password' => OLD_PASSWORD,
    ]);
});

it('ログアウトすると 204 を返し、同じクッキーでは 401 になる', function () {
    $cookies = loginAs($this);
    fromBrowser($this, $cookies)->getJson('/api/me')->assertOk();

    fromBrowser($this, $cookies)->postJson('/api/logout')->assertNoContent();

    fromBrowser($this, $cookies)->getJson('/api/me')->assertUnauthorized();
});

it('ログアウトすると、保持のクッキーでも入れなくなる', function () {
    $cookies = loginAs($this, remember: true);
    $recaller = Auth::guard('web')->getRecallerName();
    expect($cookies)->toHaveKey($recaller);

    fromBrowser($this, $cookies)->postJson('/api/logout')->assertNoContent();

    fromBrowser($this, [$recaller => $cookies[$recaller]])->getJson('/api/me')->assertUnauthorized();
});

it('ログインしていなければ、ログアウトもパスワード変更も 401', function () {
    fromBrowser($this)->postJson('/api/logout')->assertUnauthorized();
    fromBrowser($this)->putJson('/api/me/password', [])->assertUnauthorized();
});

it('パスワードを変えると 204 を返し、新しいパスワードでだけログインできる', function () {
    changePassword($this, loginAs($this))->assertNoContent();

    expect(Hash::check(NEW_PASSWORD, $this->owner->fresh()->password))->toBeTrue();

    $login = ['email' => 'owner@example.com'];
    fromBrowser($this)->postJson('/api/login', [...$login, 'password' => OLD_PASSWORD])->assertUnprocessable();
    fromBrowser($this)->postJson('/api/login', [...$login, 'password' => NEW_PASSWORD])->assertNoContent();
});

it('今のパスワードが違えば断り、パスワードは変わらない', function () {
    $cookies = loginAs($this);

    fromBrowser($this, $cookies)->putJson('/api/me/password', [
        'current_password' => 'wrong-password',
        'password' => NEW_PASSWORD,
        'password_confirmation' => NEW_PASSWORD,
    ])->assertUnprocessable()->assertExactJson([
        'message' => '入力に誤りがあります',
        'errors' => ['current_password' => ['今のパスワードが違います']],
    ]);

    expect(Hash::check(OLD_PASSWORD, $this->owner->fresh()->password))->toBeTrue();
});

it('入力の誤りは、項目ごとに日本語で返す', function (array $data, string $field, string $message) {
    $cookies = loginAs($this);

    fromBrowser($this, $cookies)->putJson('/api/me/password', [
        'current_password' => OLD_PASSWORD,
        'password' => NEW_PASSWORD,
        'password_confirmation' => NEW_PASSWORD,
        ...$data,
    ])->assertUnprocessable()->assertJsonPath("errors.{$field}.0", $message);

    expect(Hash::check(OLD_PASSWORD, $this->owner->fresh()->password))->toBeTrue();
})->with([
    '今のパスワードが空' => [['current_password' => ''], 'current_password', '今のパスワードを入力してください'],
    '新しいパスワードが空' => [['password' => ''], 'password', '新しいパスワードを入力してください'],
    '7文字' => [['password' => '1234567', 'password_confirmation' => '1234567'], 'password', '新しいパスワードは8文字以上にしてください'],
    '256文字' => [['password' => str_repeat('a', 256), 'password_confirmation' => str_repeat('a', 256)], 'password', '新しいパスワードは255文字までにしてください'],
    '確認が違う' => [['password_confirmation' => 'different-password'], 'password', '新しいパスワードが確認用と一致しません'],
]);

it('8文字ちょうどなら変えられる', function () {
    fromBrowser($this, loginAs($this))->putJson('/api/me/password', [
        'current_password' => OLD_PASSWORD,
        'password' => '12345678',
        'password_confirmation' => '12345678',
    ])->assertNoContent();
});

it('パスワードを変えると、ほかのブラウザのログインは切れ、今の画面は使い続けられる', function () {
    $other = loginAs($this);
    $current = loginAs($this);
    fromBrowser($this, $other)->getJson('/api/me')->assertOk();
    fromBrowser($this, $current)->getJson('/api/me')->assertOk();

    $response = changePassword($this, $current)->assertNoContent();

    fromBrowser($this, $other)->getJson('/api/me')->assertUnauthorized();
    fromBrowser($this, sessionCookies($response))->getJson('/api/me')->assertOk();
});

it('セッションが切れて保持のクッキーだけになったブラウザも、パスワードを変えると入れなくなる', function () {
    $other = loginAs($this, remember: true);
    $recaller = Auth::guard('web')->getRecallerName();

    // 変更の前は、保持のクッキーだけで入れる
    fromBrowser($this, [$recaller => $other[$recaller]])->getJson('/api/me')->assertOk();

    changePassword($this, loginAs($this))->assertNoContent();

    fromBrowser($this, [$recaller => $other[$recaller]])->getJson('/api/me')->assertUnauthorized();
});

it('今の画面が保持つきなら、新しい保持のクッキーを渡し、それで入れる', function () {
    $response = changePassword($this, loginAs($this, remember: true))->assertNoContent();

    $recaller = Auth::guard('web')->getRecallerName();
    $cookies = sessionCookies($response);
    expect($cookies)->toHaveKey($recaller);

    fromBrowser($this, [$recaller => $cookies[$recaller]])->getJson('/api/me')->assertOk();
});

it('今の画面が保持なしなら、保持のクッキーは渡さない', function () {
    $response = changePassword($this, loginAs($this))->assertNoContent();

    expect(sessionCookies($response))->not->toHaveKey(Auth::guard('web')->getRecallerName());
});
