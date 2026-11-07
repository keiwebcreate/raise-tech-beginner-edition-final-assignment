<?php

use App\Actions\SaveRecipeAction;
use App\Models\Category;
use App\Models\CookingLog;
use App\Models\Recipe;
use App\Models\Tag;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Illuminate\Database\QueryException;

// カテゴリ・タグ・レシピの登録と詳細（A-06・A-07・A-09・A-10）

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function recipeInput(array $overrides = []): array
{
    return array_replace([
        'name' => '肉じゃが',
        'name_kana' => 'にくじゃが',
        'category_id' => Category::query()->value('id') ?? Category::factory()->create()->id,
        'servings' => 2,
        'cook_minutes' => 30,
        'memo' => '砂糖は少なめ',
        'tags' => ['和食'],
        'ingredients' => [
            ['name' => 'じゃがいも', 'quantity' => '3個'],
            ['name' => '塩', 'quantity' => null],
        ],
        'steps' => [['body' => '切る'], ['body' => '煮る']],
    ], $overrides);
}

describe('ログインしていないとき', function () {
    it('どの API も 401 を返す', function (string $method, string $uri) {
        $this->json($method, $uri)->assertUnauthorized();
    })->with([
        ['GET', '/api/categories'],
        ['GET', '/api/tags'],
        ['GET', '/api/recipes/1'],
        ['POST', '/api/recipes'],
    ]);

    it('登録を断り、何も保存しない', function () {
        $this->postJson('/api/recipes', recipeInput())->assertUnauthorized();

        $this->assertDatabaseCount('recipes', 0);
    });
});

describe('ログインしているとき', function () {
    beforeEach(function () {
        $this->actingAs(User::factory()->create());
    });

    it('カテゴリを並び順で返す', function () {
        $this->seed(CategorySeeder::class);

        $data = $this->getJson('/api/categories')->assertOk()->json('data');

        expect($data)->toHaveCount(12)
            ->and(array_keys($data[0]))->toBe(['id', 'name'])
            ->and($data[0]['name'])->toBe('主菜')
            ->and($data[11]['name'])->toBe('その他');
    });

    it('タグを名前の順に、使っているレシピの数つきで返す', function () {
        $recipes = Recipe::factory()->count(2)->create();
        $recipes[0]->tags()->attach(Tag::factory()->create(['name' => 'わしょく']));
        $recipes[1]->tags()->attach(Tag::where('name', 'わしょく')->first());
        $recipes[1]->tags()->attach(Tag::factory()->create(['name' => 'あさごはん']));

        $this->getJson('/api/tags')->assertOk()->assertJson(['data' => [
            ['name' => 'あさごはん', 'recipes_count' => 1],
            ['name' => 'わしょく', 'recipes_count' => 2],
        ]]);
    });

    it('登録すると 201 で A-09 と同じ形を返し、並び順のとおりに保存する', function () {
        $response = $this->postJson('/api/recipes', recipeInput())->assertCreated();

        $response->assertJson([
            'name' => '肉じゃが',
            'name_kana' => 'にくじゃが',
            'servings' => 2,
            'cook_minutes' => 30,
            'memo' => '砂糖は少なめ',
            'is_favorite' => false,
            'photo_url' => null,
            'thumb_url' => null,
            'ingredients' => [
                ['name' => 'じゃがいも', 'quantity' => '3個'],
                ['name' => '塩', 'quantity' => null],
            ],
            'steps' => [['body' => '切る'], ['body' => '煮る']],
            'cooking' => ['count' => 0, 'last_cooked_on' => null, 'recent_logs' => []],
        ]);
        expect(array_keys($response->json()))->toBe([
            'id', 'name', 'name_kana', 'category', 'servings', 'cook_minutes', 'memo', 'is_favorite',
            'photo_url', 'thumb_url', 'tags', 'ingredients', 'steps', 'cooking', 'created_at', 'updated_at',
        ])
            ->and($response->json('tags.0.name'))->toBe('和食')
            ->and($response->json('tags.0'))->not->toHaveKey('recipes_count')
            ->and($response->json('created_at'))->toEndWith('+09:00');

        $this->assertDatabaseHas('ingredients', ['name' => 'じゃがいも', 'position' => 1]);
        $this->assertDatabaseHas('ingredients', ['name' => '塩', 'position' => 2]);
        $this->assertDatabaseHas('steps', ['body' => '煮る', 'position' => 2]);
    });

    it('必須の項目だけでも登録できる', function () {
        $response = $this->postJson('/api/recipes', [
            'name' => 'お茶',
            'category_id' => Category::factory()->create()->id,
            'servings' => 1,
            'ingredients' => [['name' => '茶葉']],
            'steps' => [['body' => 'いれる']],
        ])->assertCreated();

        $response->assertJson([
            'name_kana' => null,
            'cook_minutes' => null,
            'memo' => null,
            'tags' => [],
        ]);
    });

    it('写真と同じ multipart の形でも登録できる', function () {
        $input = recipeInput();
        $input['servings'] = '2';

        $this->post('/api/recipes', $input, ['Accept' => 'application/json', 'Content-Type' => 'multipart/form-data'])
            ->assertCreated();
    });

    it('料理名・よみがな・材料名・分量・タグは文字をそろえて保存し、作り方とメモは書いたまま残す', function () {
        $response = $this->postJson('/api/recipes', recipeInput([
            'name' => '　ｼﾞｬｶﾞｲﾓの　煮物 ',
            'name_kana' => '　じゃがいも  の にもの ',
            'tags' => ['Ｔｏｍａｔｏ'],
            'ingredients' => [['name' => 'ｼﾞｬｶﾞｲﾓ', 'quantity' => '大さじ２']],
            'steps' => [['body' => '①ＡをＢに混ぜる']],
            'memo' => '１０分でできる',
        ]))->assertCreated();

        $response->assertJson([
            'name' => 'ジャガイモの 煮物',
            'name_kana' => 'じゃがいも の にもの',
            'tags' => [['name' => 'Tomato']],
            'ingredients' => [['name' => 'ジャガイモ', 'quantity' => '大さじ2']],
            'steps' => [['body' => '①ＡをＢに混ぜる']],
            'memo' => '１０分でできる',
        ]);
    });

    it('そろえた後の文字数で長さを確かめる', function () {
        // 半角カタカナの濁点つきは、そろえると短くなる
        $this->postJson('/api/recipes', recipeInput(['name' => str_repeat('ｶﾞ', 100)]))
            ->assertCreated();
    });

    it('同じ名前のタグは1つにまとめる', function () {
        $response = $this->postJson('/api/recipes', recipeInput([
            'tags' => ['トマト', 'とまと', 'Soup', 'soup', 'ＳＯＵＰ'],
        ]))->assertCreated();

        expect($response->json('tags'))->toHaveCount(2);
        $this->assertDatabaseCount('tags', 2);
    });

    it('すでにあるタグは、新しく作らずに使う', function () {
        $tag = Tag::factory()->create(['name' => 'トマト']);
        Tag::factory()->create(['name' => 'Soup'])->recipes()->attach(Recipe::factory()->create());
        $tag->recipes()->attach(Recipe::factory()->create());

        $response = $this->postJson('/api/recipes', recipeInput(['tags' => ['とまと', 'SOUP']]))
            ->assertCreated();

        expect(collect($response->json('tags'))->pluck('name')->sort()->values()->all())
            ->toBe(['Soup', 'トマト']);
        $this->assertDatabaseCount('tags', 2);
    });

    it('上限ちょうどなら登録できる', function () {
        $this->postJson('/api/recipes', recipeInput([
            'name' => str_repeat('あ', 100),
            'name_kana' => str_repeat('あ', 100),
            'servings' => 99,
            'cook_minutes' => 999,
            'memo' => str_repeat('あ', 2000),
            'tags' => array_map(fn ($i) => str_repeat('あ', 19).$i, range(0, 9)),
            'ingredients' => array_fill(0, 50, ['name' => str_repeat('あ', 50), 'quantity' => str_repeat('あ', 30)]),
            'steps' => array_fill(0, 50, ['body' => str_repeat('あ', 500)]),
        ]))->assertCreated();
    });

    it('入力に誤りがあれば 422 を日本語で返し、何も保存しない', function (array $overrides, string $key, string $message) {
        $response = $this->postJson('/api/recipes', recipeInput($overrides))
            ->assertUnprocessable()
            ->assertJsonPath('message', '入力に誤りがあります');

        // キーが「ingredients.0.name」のように . を含むので、配列として取り出す
        expect($response->json('errors')[$key][0] ?? null)->toBe($message);
        $this->assertDatabaseCount('recipes', 0);
    })->with([
        '料理名がない' => [['name' => ''], 'name', '料理名を入力してください'],
        '料理名が長い' => [['name' => str_repeat('あ', 101)], 'name', '料理名は100文字までにしてください'],
        'よみがなにカタカナ' => [['name_kana' => 'ニクジャガ'], 'name_kana', 'よみがなはひらがなで入力してください'],
        'カテゴリがない' => [['category_id' => null], 'category_id', 'カテゴリを選んでください'],
        'カテゴリが存在しない' => [['category_id' => 999999], 'category_id', 'カテゴリが正しくありません'],
        '何人分が0' => [['servings' => 0], 'servings', '何人分は1から99までにしてください'],
        '何人分が100' => [['servings' => 100], 'servings', '何人分は1から99までにしてください'],
        '調理時間が1000' => [['cook_minutes' => 1000], 'cook_minutes', '調理時間は1から999までにしてください'],
        'メモが長い' => [['memo' => str_repeat('あ', 2001)], 'memo', 'メモは2000文字までにしてください'],
        'タグが11個' => [['tags' => array_map(fn ($i) => "tag{$i}", range(1, 11))], 'tags', 'タグは10個までにしてください'],
        'タグが長い' => [['tags' => [str_repeat('あ', 21)]], 'tags.0', 'タグは20文字までにしてください'],
        '材料がない' => [['ingredients' => []], 'ingredients', '材料を入力してください'],
        '材料が51行' => [['ingredients' => array_fill(0, 51, ['name' => 'a'])], 'ingredients', '材料は50行までにしてください'],
        '材料名がない' => [['ingredients' => [['name' => '', 'quantity' => '1個']]], 'ingredients.0.name', '材料名を入力してください'],
        '材料名が長い' => [['ingredients' => [['name' => str_repeat('あ', 51)]]], 'ingredients.0.name', '材料名は50文字までにしてください'],
        '分量が長い' => [['ingredients' => [['name' => 'a', 'quantity' => str_repeat('あ', 31)]]], 'ingredients.0.quantity', '分量は30文字までにしてください'],
        '作り方がない' => [['steps' => []], 'steps', '作り方を入力してください'],
        '作り方が51行' => [['steps' => array_fill(0, 51, ['body' => 'a'])], 'steps', '作り方は50行までにしてください'],
        '手順が長い' => [['steps' => [['body' => str_repeat('あ', 501)]]], 'steps.0.body', '手順は500文字までにしてください'],
    ]);

    it('変な形の入力でも 500 にせず 422 を返す', function (array $overrides) {
        $this->postJson('/api/recipes', recipeInput($overrides))->assertUnprocessable();
    })->with([
        '料理名が配列' => [['name' => ['a']]],
        'カテゴリが配列' => [['category_id' => [1]]],
        'タグが文字' => [['tags' => 'a']],
        'タグの中が配列' => [['tags' => [['a']]]],
        '材料が文字' => [['ingredients' => 'a']],
        '材料の行が文字' => [['ingredients' => ['a']]],
        '材料名が配列' => [['ingredients' => [['name' => ['a']]]]],
        '手順の行が文字' => [['steps' => ['a']]],
    ]);

    it('決まった項目以外は保存しない', function () {
        $response = $this->postJson('/api/recipes', recipeInput([
            'is_favorite' => true,
            'photo_path' => 'evil.webp',
            'id' => 999,
        ]))->assertCreated();

        expect($response->json('is_favorite'))->toBeFalse()
            ->and($response->json('id'))->not->toBe(999);
        $this->assertDatabaseHas('recipes', ['photo_path' => null]);
    });

    it('保存の途中で失敗したら、全部取り消す', function () {
        $input = recipeInput([
            // 入力チェックを通らないはずの長さのタグで、DB のエラーを起こす
            'tags' => [str_repeat('あ', 21)],
        ]);

        expect(fn () => app(SaveRecipeAction::class)->execute(null, $input))
            ->toThrow(QueryException::class);

        $this->assertDatabaseCount('recipes', 0);
        $this->assertDatabaseCount('ingredients', 0);
        $this->assertDatabaseCount('steps', 0);
    });

    it('保存すると、使われなくなったタグを片付ける', function () {
        $recipe = Recipe::factory()->create();
        $recipe->tags()->attach(Tag::factory()->create(['name' => '古いタグ']));

        app(SaveRecipeAction::class)->execute($recipe, recipeInput(['tags' => ['新しいタグ']]));

        $this->assertDatabaseMissing('tags', ['name' => '古いタグ']);
        $this->assertDatabaseHas('tags', ['name' => '新しいタグ']);
    });

    it('詳細は材料と手順を並び順で、作った記録を新しい順に3件返す', function () {
        $recipe = Recipe::factory()->create();
        $recipe->ingredients()->create(['position' => 2, 'name' => '後']);
        $recipe->ingredients()->create(['position' => 1, 'name' => '先']);
        foreach (['2026-11-01', '2026-11-04', '2026-11-02', '2026-11-03'] as $date) {
            CookingLog::factory()->for($recipe)->create(['cooked_on' => $date, 'note' => "note {$date}"]);
        }

        $response = $this->getJson("/api/recipes/{$recipe->id}")->assertOk();

        expect(collect($response->json('ingredients'))->pluck('name')->all())->toBe(['先', '後'])
            ->and($response->json('cooking.count'))->toBe(4)
            ->and($response->json('cooking.last_cooked_on'))->toBe('2026-11-04')
            ->and(collect($response->json('cooking.recent_logs'))->pluck('cooked_on')->all())
            ->toBe(['2026-11-04', '2026-11-03', '2026-11-02']);
    });

    it('ない ID の詳細は 404 を日本語で返す', function (string $id) {
        $this->getJson("/api/recipes/{$id}")
            ->assertNotFound()
            ->assertExactJson(['message' => '見つかりません']);
    })->with(['999999', 'abc']);
});
