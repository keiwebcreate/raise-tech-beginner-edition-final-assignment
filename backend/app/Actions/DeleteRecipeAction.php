<?php

namespace App\Actions;

use App\Models\Recipe;
use App\Models\Tag;
use Illuminate\Support\Facades\DB;

// レシピの削除（API 設計書 A-12）。材料・手順・タグとのつながり・作った記録はデータベースが一緒に消す。
// 写真の片付けは写真のイシューで足す
class DeleteRecipeAction
{
    public function execute(Recipe $recipe): void
    {
        DB::transaction(function () use ($recipe) {
            $recipe->delete();

            // どのレシピにも付いていないタグを片付ける（F-33）
            Tag::doesntHave('recipes')->delete();
        });
    }
}
