<?php

namespace App\Http\Resources;

use App\Models\Recipe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * レシピ一覧（A-08）の1件の形
 *
 * @mixin Recipe
 */
class RecipeListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => new CategoryResource($this->category),
            'cook_minutes' => $this->cook_minutes,
            'tags' => TagResource::collection($this->tags),
            'is_favorite' => $this->is_favorite,
            // 写真は写真のイシューで足す
            'thumb_url' => null,
            'last_cooked_on' => $this->cooking_logs_max_cooked_on,
        ];
    }
}
