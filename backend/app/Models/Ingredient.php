<?php

namespace App\Models;

use Database\Factories\IngredientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['recipe_id', 'position', 'name', 'quantity'])]
class Ingredient extends Model
{
    /** @use HasFactory<IngredientFactory> */
    use HasFactory;

    // 日時の列を持たない（テーブル設計書 3.4）
    public $timestamps = false;

    /** @return BelongsTo<Recipe, $this> */
    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }
}
