<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TagResource;
use App\Models\Tag;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TagController extends Controller
{
    // A-07 タグ（名前の順。使っているレシピの数つき）
    public function index(): AnonymousResourceCollection
    {
        return TagResource::collection(Tag::withCount('recipes')->orderBy('name')->get());
    }
}
