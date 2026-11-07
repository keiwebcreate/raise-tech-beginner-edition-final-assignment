<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

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
}
