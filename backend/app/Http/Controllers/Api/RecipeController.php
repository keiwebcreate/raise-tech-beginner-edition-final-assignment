<?php

namespace App\Http\Controllers\Api;

use App\Actions\SaveRecipeAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\RecipeIndexRequest;
use App\Http\Requests\SaveRecipeRequest;
use App\Http\Resources\RecipeListResource;
use App\Http\Resources\RecipeResource;
use App\Models\Recipe;
use App\Queries\RecipeQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RecipeController extends Controller
{
    private const PER_PAGE = 20;

    // A-08 レシピ一覧
    public function index(RecipeIndexRequest $request, RecipeQuery $query): AnonymousResourceCollection
    {
        $recipes = $query->build($request->validated())
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return RecipeListResource::collection($recipes);
    }

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
