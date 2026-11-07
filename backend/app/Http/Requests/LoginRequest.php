<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

// A-02 ログインの入力チェックと、回数制限つきの確認（詳細設計書 4.2・4.4）
class LoginRequest extends FormRequest
{
    private const MAX_ATTEMPTS = 5;

    private const DECAY_SECONDS = 60;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * メールアドレスとパスワードを確かめて、ログインする。
     * だめなときは、どちらが違うかを教えない
     */
    public function authenticate(): void
    {
        $key = $this->throttleKey();

        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            throw new HttpResponseException(response()->json([
                'message' => 'しばらく受け付けません。1分後にもう一度お試しください',
            ], 429));
        }

        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($key, self::DECAY_SECONDS);

            throw new HttpResponseException(response()->json([
                'message' => 'メールアドレスかパスワードが違います',
            ], 422));
        }

        RateLimiter::clear($key);
    }

    // 「メールアドレス＋接続元の IP アドレス」ごとに数える
    private function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')->value())).'|'.$this->ip();
    }
}
