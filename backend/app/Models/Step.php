<?php

namespace App\Models;

use Database\Factories\StepFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['recipe_id', 'position', 'body'])]
class Step extends Model
{
    /** @use HasFactory<StepFactory> */
    use HasFactory;

    // 日時の列を持たない（テーブル設計書 3.5）
    public $timestamps = false;

    /** @return BelongsTo<Recipe, $this> */
    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }
}
