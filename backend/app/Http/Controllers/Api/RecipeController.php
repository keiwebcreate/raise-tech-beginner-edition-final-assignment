<?php

namespace App\Http\Controllers\Api;

use App\Actions\SaveRecipeAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\SaveRecipeRequest;
use App\Http\Resources\RecipeResource;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;

class RecipeController extends Controller
{
    // A-09 レシピ詳細
    public function show(Recipe $recipe): RecipeResource
    {
        return new RecipeResource($recipe);
    }

    // A-10 レシピ登録
    public function store(SaveRecipeRequest $request, SaveRecipeAction $action): JsonResponse
    {
        $recipe = $action->execute(null, $request->validated());

        return (new RecipeResource($recipe))->response()->setStatusCode(201);
    }
}
