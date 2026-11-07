<?php

namespace App\Http\Requests;

use App\Support\TextNormalizer;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

// A-10 レシピ登録・A-11 レシピ編集の入力チェック（API 設計書 A-10・A-11）
class SaveRecipeRequest extends FormRequest
{
    // 5000万画素まで。容量が小さくても、画素数が多い画像は開くのに大量のメモリを使う
    private const PHOTO_MAX_PIXELS = 50_000_000;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            // mimes はファイル名ではなく中身で確かめる（N-27）
            'photo' => [
                'bail', 'nullable', 'file', 'mimes:jpeg,jpg,png,webp', 'max:5120',
                function (string $attribute, UploadedFile $value, Closure $fail) {
                    $size = @getimagesize((string) $value->getRealPath());
                    if ($size !== false && $size[0] * $size[1] > self::PHOTO_MAX_PIXELS) {
                        $fail('写真の画素数が多すぎます。別の写真を選んでください');
                    }
                },
            ],
            'remove_photo' => ['nullable', 'boolean'],
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
