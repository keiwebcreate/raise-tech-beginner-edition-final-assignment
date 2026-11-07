<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoryController extends Controller
{
    // A-06 カテゴリ
    public function index(): AnonymousResourceCollection
    {
        return CategoryResource::collection(Category::orderBy('sort_order')->get());
    }
}
