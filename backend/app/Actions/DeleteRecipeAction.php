<?php

namespace App\Actions;

use App\Models\Recipe;
use App\Models\Tag;
use App\Support\RecipePhotoStorage;
use Illuminate\Support\Facades\DB;

// レシピの削除（API 設計書 A-12）。材料・手順・タグとのつながり・作った記録はデータベースが一緒に消す
class DeleteRecipeAction
{
    public function __construct(private RecipePhotoStorage $photos) {}

    public function execute(Recipe $recipe): void
    {
        $photo = $recipe->photo_path;

        DB::transaction(function () use ($recipe) {
            $recipe->delete();

            // どのレシピにも付いていないタグを片付ける（F-33）
            Tag::doesntHave('recipes')->delete();
        });

        // 写真は DB の外にあるので、DB の確定のあとに消す（テーブル設計書 5章）
        if ($photo !== null) {
            $this->photos->delete($photo);
        }
    }
}
