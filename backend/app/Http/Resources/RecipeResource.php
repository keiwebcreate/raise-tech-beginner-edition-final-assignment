<?php

namespace App\Http\Resources;

use App\Models\Recipe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * レシピ詳細（A-09）の形
 *
 * @mixin Recipe
 */
class RecipeResource extends JsonResource
{
    // 1件のときは data で包まない（API 設計書 A-09）
    public static $wrap = null;

    private const RECENT_LOGS = 3;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_kana' => $this->name_kana,
            'category' => new CategoryResource($this->category),
            'servings' => $this->servings,
            'cook_minutes' => $this->cook_minutes,
            'memo' => $this->memo,
            'is_favorite' => $this->is_favorite,
            // 写真は写真のイシューで足す
            'photo_url' => null,
            'thumb_url' => null,
            'tags' => TagResource::collection($this->tags),
            'ingredients' => $this->ingredients->map(fn ($row) => [
                'name' => $row->name,
                'quantity' => $row->quantity,
            ]),
            'steps' => $this->steps->map(fn ($row) => ['body' => $row->body]),
            'cooking' => [
                'count' => $this->cookingLogs()->count(),
                'last_cooked_on' => $this->cookingLogs()->max('cooked_on'),
                'recent_logs' => CookingLogResource::collection(
                    $this->cookingLogs()
                        ->orderByDesc('cooked_on')
                        ->orderByDesc('id')
                        ->limit(self::RECENT_LOGS)
                        ->get()
                ),
            ],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
