<?php

namespace App\Http\Requests;

use App\Support\TextNormalizer;
use Illuminate\Foundation\Http\FormRequest;

// A-08 レシピ一覧の検索条件（API 設計書 A-08）
class RecipeIndexRequest extends FormRequest
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
            'q' => ['nullable', 'string', 'max:100'],
            // 消えたタグの URL を開いたときは、エラーにせず0件にする
            'category_id' => ['nullable', 'integer', 'min:1'],
            'tag_id' => ['nullable', 'integer', 'min:1'],
            'favorite' => ['nullable', 'in:1'],
            'max_minutes' => ['nullable', 'in:15,30,60'],
            'sort' => ['nullable', 'in:newest,name,cook_minutes,last_cooked'],
            // とても大きな数は、読み飛ばす件数の計算があふれるので断る
            'page' => ['nullable', 'integer', 'between:1,1000000'],
        ];
    }

    // 保存するときと同じように文字をそろえてから探す（詳細設計書 4.3）
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('q'))) {
            $this->merge(['q' => TextNormalizer::normalize($this->input('q'))]);
        }
    }
}
