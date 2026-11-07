<?php

namespace App\Http\Requests;

use App\Support\TextNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

// A-10 レシピ登録の入力チェック（API 設計書 A-10）。写真は写真のイシューで足す
class SaveRecipeRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:100'],
            // ひらがな・長音・空白だけ
            'name_kana' => ['nullable', 'string', 'max:100', 'regex:/^[ぁ-ゖゝゞー ]+$/u'],
            'category_id' => ['bail', 'required', 'integer', 'exists:categories,id'],
            'servings' => ['required', 'integer', 'between:1,99'],
            'cook_minutes' => ['nullable', 'integer', 'between:1,999'],
            'memo' => ['nullable', 'string', 'max:2000'],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['required', 'string', 'max:20'],
            'ingredients' => ['required', 'array', 'min:1', 'max:50'],
            'ingredients.*.name' => ['required', 'string', 'max:50'],
            'ingredients.*.quantity' => ['nullable', 'string', 'max:30'],
            'steps' => ['required', 'array', 'min:1', 'max:50'],
            'steps.*.body' => ['required', 'string', 'max:500'],
        ];
    }

    // 文字をそろえてから、長さなどを確かめる（詳細設計書 4.3）。作り方とメモは書いたまま残す
    protected function prepareForValidation(): void
    {
        $merge = [];

        foreach (['name', 'name_kana'] as $field) {
            if (is_string($this->input($field))) {
                $merge[$field] = TextNormalizer::normalize($this->input($field));
            }
        }

        if (is_array($this->input('tags'))) {
            $merge['tags'] = $this->normalizedTags($this->input('tags'));
        }

        if (is_array($this->input('ingredients'))) {
            $merge['ingredients'] = array_map(function ($row) {
                if (! is_array($row)) {
                    return $row;
                }
                foreach (['name', 'quantity'] as $field) {
                    if (isset($row[$field]) && is_string($row[$field])) {
                        $row[$field] = TextNormalizer::normalize($row[$field]);
                    }
                }

                return $row;
            }, $this->input('ingredients'));
        }

        $this->merge($merge);
    }

    /**
     * 空を除き、英字の大文字・小文字だけが違うものを1つにまとめる
     * （「トマト」と「とまと」は保存のときに DB の照合順序で同じタグになる）
     *
     * @param  array<mixed>  $tags
     * @return array<mixed>
     */
    private function normalizedTags(array $tags): array
    {
        $unique = [];

        foreach ($tags as $tag) {
            if (! is_string($tag)) {
                $unique[] = $tag;

                continue;
            }
            $normalized = TextNormalizer::normalize($tag);
            if ($normalized !== '') {
                $unique[Str::lower($normalized)] ??= $normalized;
            }
        }

        return array_values($unique);
    }
}
