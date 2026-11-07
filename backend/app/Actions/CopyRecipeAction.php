<?php

namespace App\Actions;

use App\Models\Recipe;
use App\Support\RecipePhotoStorage;
use Illuminate\Support\Facades\DB;
use Throwable;

// レシピの複製（要件定義書 4.3・API 設計書 A-15）。お気に入りと作った記録はコピーしない
class CopyRecipeAction
{
    private const SUFFIX = '（コピー）';

    private const NAME_MAX_LENGTH = 100;

    public function __construct(private RecipePhotoStorage $photos) {}

    public function execute(Recipe $recipe): Recipe
    {
        // 写真は新しい名前でコピーする（元のレシピの写真を消しても、複製に影響しない）
        $newPhoto = $recipe->photo_path !== null ? $this->photos->copy($recipe->photo_path) : null;

        try {
            return DB::transaction(function () use ($recipe, $newPhoto) {
                $copy = $recipe->replicate(['is_favorite']);
                $copy->name = $this->copyName($recipe->name);
                $copy->photo_path = $newPhoto;
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
        } catch (Throwable $exception) {
            if ($newPhoto !== null) {
                $this->photos->delete($newPhoto);
            }

            throw $exception;
        }
    }

    // 100文字を超えるときは、料理名の後ろを削ってから付ける
    private function copyName(string $name): string
    {
        $room = self::NAME_MAX_LENGTH - mb_strlen(self::SUFFIX);

        return mb_substr($name, 0, $room).self::SUFFIX;
    }
}
