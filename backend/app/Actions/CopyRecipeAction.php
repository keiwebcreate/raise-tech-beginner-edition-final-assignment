<?php

namespace App\Actions;

use App\Models\Recipe;
use Illuminate\Support\Facades\DB;

// レシピの複製（要件定義書 4.3・API 設計書 A-15）。お気に入りと作った記録はコピーしない。
// 写真のコピーは写真のイシューで足す
class CopyRecipeAction
{
    private const SUFFIX = '（コピー）';

    private const NAME_MAX_LENGTH = 100;

    public function execute(Recipe $recipe): Recipe
    {
        return DB::transaction(function () use ($recipe) {
            $copy = $recipe->replicate(['is_favorite', 'photo_path']);
            $copy->name = $this->copyName($recipe->name);
            $copy->save();

            foreach ($recipe->ingredients as $row) {
                $copy->ingredients()->create($row->only(['position', 'name', 'quantity']));
            }
            foreach ($recipe->steps as $row) {
                $copy->steps()->create($row->only(['position', 'body']));
            }
            $copy->tags()->sync($recipe->tags->modelKeys());

            // DB の初期値（お気に入りの false など）も入った形で返す
            return $copy->refresh();
        });
    }

    // 100文字を超えるときは、料理名の後ろを削ってから付ける
    private function copyName(string $name): string
    {
        $room = self::NAME_MAX_LENGTH - mb_strlen(self::SUFFIX);

        return mb_substr($name, 0, $room).self::SUFFIX;
    }
}
