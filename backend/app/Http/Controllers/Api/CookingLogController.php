<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCookingLogRequest;
use App\Http\Resources\CookingLogResource;
use App\Models\CookingLog;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class CookingLogController extends Controller
{
    // A-16 作った記録の全部。新しい順で、同じ日は作った順の逆
    public function index(Recipe $recipe): AnonymousResourceCollection
    {
        return CookingLogResource::collection(
            $recipe->cookingLogs()->orderByDesc('cooked_on')->orderByDesc('id')->get()
        );
    }

    // A-17 作った記録の追加
    public function store(StoreCookingLogRequest $request, Recipe $recipe): JsonResponse
    {
        $log = $recipe->cookingLogs()->create($request->validated());

        return (new CookingLogResource($log))->response()->setStatusCode(201);
    }

    // A-18 作った記録の削除
    public function destroy(CookingLog $cookingLog): Response
    {
        $cookingLog->delete();

        return response()->noContent();
    }
}
