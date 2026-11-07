<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

// A-05 パスワード変更の入力チェック
class UpdatePasswordRequest extends FormRequest
{
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
            'current_password' => ['required', 'string', 'current_password:web'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'current_password' => '今のパスワード',
            'password' => '新しいパスワード',
        ];
    }
}
