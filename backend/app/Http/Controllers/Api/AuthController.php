<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use Illuminate\Http\Response;

class AuthController extends Controller
{
    // A-02 ログイン
    public function login(LoginRequest $request): Response
    {
        // セッションがあるのは、Sanctum が「画面からの要求」と認めたときだけ。
        // そのときは CSRF の確認も行われるので、それ以外からのログインは断る
        abort_unless($request->hasSession(), 403, '画面以外からのログインは受け付けません');

        $request->authenticate();

        // 他人に番号を仕込まれる攻撃を防ぐため、セッションの番号を作り直す
        $request->session()->regenerate();

        return response()->noContent();
    }
}
