<?php

namespace App\Actions;

use App\Models\Recipe;
use App\Models\Tag;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

// レシピの保存（詳細設計書 4.7）。レシピ・材料・手順・タグを1つのトランザクションでまとめて保存する。
// 写真は写真のイシューで足す
class SaveRecipeAction
{
    /**
     * @param  array<string, mixed>  $input  SaveRecipeRequest で確かめた値
     */
    public function execute(?Recipe $recipe, array $input): Recipe
    {
        return DB::transaction(function () use ($recipe, $input) {
            $recipe ??= new Recipe;
            $recipe->fill(Arr::only($input, ['name', 'name_kana', 'category_id', 'servings', 'cook_minutes', 'memo']));
            $recipe->save();

            $this->replaceRows($recipe, $input);

            $recipe->tags()->sync($this->tagIds($input['tags'] ?? []));

            // どのレシピにも付いていないタグを片付ける（F-33）
            Tag::doesntHave('recipes')->delete();

            // DB の初期値（お気に入りの false など）も入った形で返す
            return $recipe->refresh();
        });
    }

    // 材料と手順は、保存のたびにまとめて入れ直す（テーブル設計書 3.4）。並び順は送られた順
    /**
     * @param  array<string, mixed>  $input
     */
    private function replaceRows(Recipe $recipe, array $input): void
    {
        $recipe->ingredients()->delete();
        foreach (array_values($input['ingredients']) as $index => $row) {
            $recipe->ingredients()->create([
                'position' => $index + 1,
                'name' => $row['name'],
                'quantity' => $row['quantity'] ?? null,
            ]);
        }

        $recipe->steps()->delete();
        foreach (array_values($input['steps']) as $index => $row) {
            $recipe->steps()->create([
                'position' => $index + 1,
                'body' => $row['body'],
            ]);
        }
    }

    /**
     * タグを名前で探し、なければ作る。
     * 比べるときは照合順序（ひらがなとカタカナは同じ）と小文字（英字の大小は同じ）を使う
     *
     * @param  array<int, string>  $names
     * @return array<int, int>
     */
    private function tagIds(array $names): array
    {
        $ids = [];

        foreach ($names as $name) {
            $tag = Tag::whereRaw('LOWER(name) = LOWER(?)', [$name])->first()
                ?? Tag::create(['name' => $name]);
            $ids[] = $tag->id;
        }

        return array_values(array_unique($ids));
    }
}
