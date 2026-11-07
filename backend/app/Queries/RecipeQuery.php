<?php

namespace App\Queries;

use App\Models\Recipe;
use Illuminate\Database\Eloquent\Builder;

// 一覧の検索・絞り込み・並び替えの組み立て（詳細設計書 4.5）
class RecipeQuery
{
    /**
     * @param  array<string, mixed>  $filters  確かめ済みの検索条件
     * @return Builder<Recipe>
     */
    public function build(array $filters): Builder
    {
        $query = Recipe::query()
            ->with(['category', 'tags'])
            ->withMax('cookingLogs', 'cooked_on');

        if (filled($filters['q'] ?? null)) {
            $this->search($query, $filters['q']);
        }
        if (filled($filters['category_id'] ?? null)) {
            $query->where('category_id', $filters['category_id']);
        }
        if (filled($filters['tag_id'] ?? null)) {
            $query->whereHas('tags', fn (Builder $tags) => $tags->whereKey($filters['tag_id']));
        }
        if (filled($filters['favorite'] ?? null)) {
            $query->where('is_favorite', true);
        }
        if (filled($filters['max_minutes'] ?? null)) {
            $query->where('cook_minutes', '<=', $filters['max_minutes']);
        }

        $this->sort($query, $filters['sort'] ?? 'newest');

        return $query;
    }

    /**
     * 照合順序は大文字と小文字を区別するので、両方を小文字にして比べる（詳細設計書 4.3）
     *
     * @param  Builder<Recipe>  $query
     */
    private function search(Builder $query, string $keyword): void
    {
        // % と _ は LIKE の特別な記号なので、ただの文字として扱う
        $like = '%'.addcslashes($keyword, '%_\\').'%';

        $query->where(function (Builder $where) use ($like) {
            $where->whereRaw('LOWER(name) LIKE LOWER(?)', [$like])
                ->orWhereRaw('LOWER(name_kana) LIKE LOWER(?)', [$like])
                ->orWhereHas('ingredients', fn (Builder $ingredients) => $ingredients
                    ->whereRaw('LOWER(name) LIKE LOWER(?)', [$like]));
        });
    }

    /**
     * 並び方は API 設計書 A-08 のとおり
     *
     * @param  Builder<Recipe>  $query
     */
    private function sort(Builder $query, string $sort): void
    {
        match ($sort) {
            'name' => $query->orderByRaw('COALESCE(name_kana, name)')->orderBy('id'),
            // 調理時間が空のものは最後
            'cook_minutes' => $this->newestLast($query->orderByRaw('cook_minutes IS NULL')->orderBy('cook_minutes')),
            // 一度も作っていないもの（空）は、古い順の先頭に来る
            'last_cooked' => $this->newestLast($query->orderBy('cooking_logs_max_cooked_on')),
            default => $this->newestLast($query),
        };
    }

    /**
     * @param  Builder<Recipe>  $query
     */
    private function newestLast(Builder $query): void
    {
        $query->orderByDesc('created_at')->orderByDesc('id');
    }
}
