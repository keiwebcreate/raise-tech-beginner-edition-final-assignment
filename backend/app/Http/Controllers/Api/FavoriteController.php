<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;

class FavoriteController extends Controller
{
    // A-13 お気に入りを付ける
    public function store(Recipe $recipe): JsonResponse
    {
        return $this->set($recipe, true);
    }

    // A-14 お気に入りを外す
    public function destroy(Recipe $recipe): JsonResponse
    {
        return $this->set($recipe, false);
    }

    private function set(Recipe $recipe, bool $isFavorite): JsonResponse
    {
        $recipe->update(['is_favorite' => $isFavorite]);

        return response()->json(['is_favorite' => $isFavorite]);
    }
}
