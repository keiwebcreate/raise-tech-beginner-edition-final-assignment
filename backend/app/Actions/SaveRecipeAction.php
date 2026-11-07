<?php

namespace App\Actions;

use App\Models\Recipe;
use App\Models\Tag;
use App\Support\RecipePhotoStorage;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Throwable;

// レシピの保存（詳細設計書 4.7）。レシピ・材料・手順・タグを1つのトランザクションでまとめて保存する
class SaveRecipeAction
{
    public function __construct(private RecipePhotoStorage $photos) {}

    /**
     * @param  array<string, mixed>  $input  SaveRecipeRequest で確かめた値
     */
    public function execute(?Recipe $recipe, array $input): Recipe
    {
        $oldPhoto = $recipe?->photo_path;
        $newPhoto = isset($input['photo']) ? $this->photos->store($input['photo']) : null;
        // 新しい写真を送ったときは remove_photo を無視する（API 設計書 A-11）
        $keptPhoto = ! empty($input['remove_photo']) ? null : $oldPhoto;

        try {
            $saved = DB::transaction(function () use ($recipe, $input, $newPhoto, $keptPhoto) {
                $recipe ??= new Recipe;
                // 画面は空の項目を送らないので、送られなかった任意の項目は空にする（編集で消せるように）
                $recipe->fill(['name_kana' => null, 'cook_minutes' => null, 'memo' => null]);
                $recipe->fill(Arr::only($input, ['name', 'name_kana', 'category_id', 'servings', 'cook_minutes', 'memo']));
                $recipe->photo_path = $newPhoto ?? $keptPhoto;
                $recipe->save();

                $this->replaceRows($recipe, $input);

                $recipe->tags()->sync($this->tagIds($input['tags'] ?? []));

                // どのレシピにも付いていないタグを片付ける（F-33）
                Tag::doesntHave('recipes')->delete();

                // DB の初期値（お気に入りの false など）も入った形で返す
                return $recipe->refresh();
            });
        } catch (Throwable $exception) {
            // DB は取り消されたので、保存した新しい写真も消す
            if ($newPhoto !== null) {
                $this->photos->delete($newPhoto);
            }

            throw $exception;
        }

        // 古い写真は、DB の確定のあとに消す
        if ($oldPhoto !== null && $saved->photo_path !== $oldPhoto) {
            $this->photos->delete($oldPhoto);
        }

        return $saved;
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
