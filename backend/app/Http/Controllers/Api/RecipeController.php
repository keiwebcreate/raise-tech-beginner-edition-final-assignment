<?php

namespace App\Http\Controllers\Api;

use App\Actions\CopyRecipeAction;
use App\Actions\DeleteRecipeAction;
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
use Illuminate\Http\Response;

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

    // A-11 レシピ編集
    public function update(SaveRecipeRequest $request, Recipe $recipe, SaveRecipeAction $action): RecipeResource
    {
        return new RecipeResource($action->execute($recipe, $request->validated()));
    }

    // A-12 レシピ削除
    public function destroy(Recipe $recipe, DeleteRecipeAction $action): Response
    {
        $action->execute($recipe);

        return response()->noContent();
    }

    // A-15 レシピ複製
    public function copy(Recipe $recipe, CopyRecipeAction $action): JsonResponse
    {
        return (new RecipeResource($action->execute($recipe)))->response()->setStatusCode(201);
    }
}
