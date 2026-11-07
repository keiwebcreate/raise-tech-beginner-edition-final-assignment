<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

// A-17 作った記録の追加の入力チェック（API 設計書 A-17）。メモは書いたまま残す
class StoreCookingLogRequest extends FormRequest
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
            // today はアプリのタイムゾーン（Asia/Tokyo）で判定される
            'cooked_on' => ['bail', 'required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'note' => ['nullable', 'string', 'max:200'],
        ];
    }
}
