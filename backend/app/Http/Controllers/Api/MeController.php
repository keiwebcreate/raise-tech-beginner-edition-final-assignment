<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePasswordRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class MeController extends Controller
{
    // A-04 ログイン中の持ち主
    /**
     * @return array{email: string}
     */
    public function show(Request $request): array
    {
        return ['email' => $request->user()->email];
    }

    // A-05 パスワード変更。ほかのブラウザ・端末のログインは切り、今の画面はそのまま使える
    public function updatePassword(UpdatePasswordRequest $request): Response
    {
        $password = $request->validated('password');

        $request->user()->update(['password' => $password]);

        // ほかのセッションは AuthenticateSession が、保持のクッキーは Laravel が、パスワードの変化を見つけて切る。
        // これは今の画面の保持のクッキーだけを、新しいパスワードに合わせて渡し直す
        Auth::guard('web')->logoutOtherDevices($password);

        return response()->noContent();
    }
}
