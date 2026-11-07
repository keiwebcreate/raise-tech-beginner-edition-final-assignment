<?php

use App\Models\Category;
use App\Models\CookingLog;
use App\Models\Ingredient;
use App\Models\Recipe;
use App\Models\Step;
use App\Models\Tag;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

// テーブルとシーダーが設計書のとおりに動くことを確かめる（テーブル設計書 3章・5章）

it('シーダーで12個のカテゴリが決まった順に入る', function () {
    $this->seed(DatabaseSeeder::class);

    $names = Category::orderBy('sort_order')->pluck('name')->all();

    expect($names)->toHaveCount(12)
        ->and($names[0])->toBe('主菜')
        ->and($names[11])->toBe('その他');
});

it('シーダーを2回動かしてもカテゴリは増えず、IDも変わらない', function () {
    $this->seed(DatabaseSeeder::class);
    $before = Category::orderBy('id')->pluck('id', 'name')->all();

    $this->seed(DatabaseSeeder::class);

    expect(Category::orderBy('id')->pluck('id', 'name')->all())->toBe($before);
});

it('シーダーは持ち主のアカウントを作らない', function () {
    $this->seed(DatabaseSeeder::class);

    $this->assertDatabaseCount('users', 0);
});

it('レシピを消すと、材料・手順・タグとのつながり・作った記録も消え、タグ自体は残る', function () {
    $recipe = Recipe::factory()->create();
    Ingredient::factory()->for($recipe)->create();
    Step::factory()->for($recipe)->create();
    CookingLog::factory()->for($recipe)->create();
    $tag = Tag::factory()->create();
    $recipe->tags()->attach($tag);

    // 別のレシピの行は消えない
    $other = Recipe::factory()->create();
    Ingredient::factory()->for($other)->create();

    $recipe->delete();

    $this->assertDatabaseCount('ingredients', 1);
    $this->assertDatabaseHas('ingredients', ['recipe_id' => $other->id]);
    $this->assertDatabaseCount('steps', 0);
    $this->assertDatabaseCount('cooking_logs', 0);
    $this->assertDatabaseCount('recipe_tag', 0);
    $this->assertModelExists($tag);
});

it('使われているカテゴリは消せない', function () {
    $recipe = Recipe::factory()->create();

    expect(fn () => $recipe->category->delete())->toThrow(QueryException::class);
    $this->assertModelExists($recipe->category);
});

it('使われていないカテゴリは消せる', function () {
    $category = Category::factory()->create();

    $category->delete();

    $this->assertModelMissing($category);
});

it('「トマト」と「とまと」は同じタグとして重ねて入らない', function () {
    Tag::factory()->create(['name' => 'トマト']);

    expect(fn () => Tag::factory()->create(['name' => 'とまと']))->toThrow(QueryException::class);
});

it('濁点が違うタグは別のものとして入る', function () {
    Tag::factory()->create(['name' => 'はし']);
    Tag::factory()->create(['name' => 'ばし']);

    $this->assertDatabaseCount('tags', 2);
});

it('同じレシピに同じタグを2回付けられない', function () {
    $recipe = Recipe::factory()->create();
    $tag = Tag::factory()->create();
    $recipe->tags()->attach($tag);

    expect(fn () => $recipe->tags()->attach($tag))->toThrow(QueryException::class);
});

it('同じレシピで材料と手順の並び順は重ならない', function () {
    $recipe = Recipe::factory()->create();
    Ingredient::factory()->for($recipe)->create(['position' => 1]);
    Step::factory()->for($recipe)->create(['position' => 1]);

    expect(fn () => Ingredient::factory()->for($recipe)->create(['position' => 1]))->toThrow(QueryException::class)
        ->and(fn () => Step::factory()->for($recipe)->create(['position' => 1]))->toThrow(QueryException::class);
});

it('材料と手順は並び順のとおりに取り出せる', function () {
    $recipe = Recipe::factory()->create();
    Ingredient::factory()->for($recipe)->create(['position' => 2, 'name' => '後']);
    Ingredient::factory()->for($recipe)->create(['position' => 1, 'name' => '先']);
    Step::factory()->for($recipe)->create(['position' => 2, 'body' => '後']);
    Step::factory()->for($recipe)->create(['position' => 1, 'body' => '先']);

    expect($recipe->ingredients->pluck('name')->all())->toBe(['先', '後'])
        ->and($recipe->steps->pluck('body')->all())->toBe(['先', '後']);
});

it('お気に入りの初期値は false で、true か false の値として取り出せる', function () {
    $recipe = Recipe::factory()->create();

    expect($recipe->fresh()->is_favorite)->toBeFalse();
});

it('作った日は日付として取り出せる', function () {
    $log = CookingLog::factory()->create(['cooked_on' => '2026-11-07']);

    expect($log->fresh()->cooked_on->format('Y-m-d'))->toBe('2026-11-07');
});

it('テーブルの照合順序は日本語用になっている', function () {
    $tables = ['categories', 'recipes', 'ingredients', 'steps', 'tags', 'recipe_tag', 'cooking_logs'];

    $collations = collect(DB::select(
        'SELECT TABLE_NAME AS name, TABLE_COLLATION AS collation_name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
    ))->pluck('collation_name', 'name');

    foreach ($tables as $table) {
        expect($collations[$table])->toBe('utf8mb4_ja_0900_as_cs');
    }
});

it('設計書の索引が付いている', function () {
    $indexed = fn (string $table) => collect(DB::select("SHOW INDEX FROM {$table}"))
        ->pluck('Column_name')
        ->all();

    expect($indexed('recipes'))->toContain('created_at', 'cook_minutes', 'is_favorite')
        ->and($indexed('cooking_logs'))->toContain('recipe_id', 'cooked_on')
        ->and($indexed('recipe_tag'))->toContain('tag_id');
});
