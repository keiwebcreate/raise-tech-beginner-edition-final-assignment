<?php

use App\Models\Category;
use App\Models\CookingLog;
use App\Models\Ingredient;
use App\Models\Recipe;
use App\Models\Step;
use App\Models\Tag;
use App\Models\User;

// レシピの編集・削除・複製（A-11・A-12・A-15）

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function editInput(array $overrides = []): array
{
    return array_replace([
        '_method' => 'PUT',
        'name' => '豚汁',
        'name_kana' => 'とんじる',
        'category_id' => Category::factory()->create()->id,
        'servings' => 4,
        'cook_minutes' => 20,
        'memo' => '味噌は最後',
        'tags' => ['汁物'],
        'ingredients' => [['name' => '豚肉', 'quantity' => '100g']],
        'steps' => [['body' => '煮る']],
    ], $overrides);
}

describe('ログインしていないとき', function () {
    it('401 を返し、何も変えない', function () {
        $recipe = Recipe::factory()->create(['name' => '元の名前']);

        $this->postJson("/api/recipes/{$recipe->id}", editInput())->assertUnauthorized();
        $this->deleteJson("/api/recipes/{$recipe->id}")->assertUnauthorized();
        $this->postJson("/api/recipes/{$recipe->id}/copy")->assertUnauthorized();

        expect($recipe->refresh()->name)->toBe('元の名前');
        $this->assertDatabaseCount('recipes', 1);
    });
});

describe('ログインしているとき', function () {
    beforeEach(function () {
        $this->actingAs(User::factory()->create());
    });

    describe('編集', function () {
        it('POST に _method=PUT を付けて呼ぶと、内容を変えて A-09 の形で返す', function () {
            $recipe = Recipe::factory()->create(['is_favorite' => true]);

            $response = $this->postJson("/api/recipes/{$recipe->id}", editInput())
                ->assertOk()
                ->assertJsonPath('id', $recipe->id)
                ->assertJsonPath('name', '豚汁')
                ->assertJsonPath('name_kana', 'とんじる')
                ->assertJsonPath('servings', 4)
                ->assertJsonPath('cook_minutes', 20)
                ->assertJsonPath('memo', '味噌は最後')
                ->assertJsonPath('tags.0.name', '汁物')
                // フォームにない項目は変えない
                ->assertJsonPath('is_favorite', true);

            expect($response->json('ingredients'))->toBe([['name' => '豚肉', 'quantity' => '100g']])
                ->and($response->json('steps'))->toBe([['body' => '煮る']]);
            $this->assertDatabaseCount('recipes', 1);
        });

        it('材料と手順は、送った内容と順番に丸ごと置き換える', function () {
            $recipe = Recipe::factory()->create();
            Ingredient::factory()->for($recipe)->count(3)->create();
            Step::factory()->for($recipe)->count(3)->create();

            $this->postJson("/api/recipes/{$recipe->id}", editInput([
                'ingredients' => [['name' => 'ねぎ'], ['name' => '塩']],
                'steps' => [['body' => '切る'], ['body' => '煮る']],
            ]))->assertOk();

            expect($recipe->ingredients()->pluck('name')->all())->toBe(['ねぎ', '塩'])
                ->and($recipe->steps()->pluck('body')->all())->toBe(['切る', '煮る']);
        });

        it('任意の項目を送らなければ空にする', function () {
            $recipe = Recipe::factory()->create([
                'name_kana' => 'もとの',
                'cook_minutes' => 30,
                'memo' => '元のメモ',
            ]);
            $recipe->tags()->attach(Tag::factory()->create());
            $input = editInput();
            unset($input['name_kana'], $input['cook_minutes'], $input['memo'], $input['tags']);

            $this->postJson("/api/recipes/{$recipe->id}", $input)
                ->assertOk()
                ->assertJsonPath('name_kana', null)
                ->assertJsonPath('cook_minutes', null)
                ->assertJsonPath('memo', null)
                ->assertJsonPath('tags', []);
        });

        it('使われなくなったタグは消し、ほかのレシピが使うタグは残す', function () {
            $shared = Tag::factory()->create(['name' => '共有']);
            $alone = Tag::factory()->create(['name' => '単独']);
            $recipe = Recipe::factory()->create();
            $recipe->tags()->attach([$shared->id, $alone->id]);
            Recipe::factory()->create()->tags()->attach($shared);

            $this->postJson("/api/recipes/{$recipe->id}", editInput(['tags' => ['新しい']]))->assertOk();

            $this->assertDatabaseMissing('tags', ['name' => '単独']);
            $this->assertDatabaseHas('tags', ['name' => '共有']);
            $this->assertDatabaseHas('tags', ['name' => '新しい']);
        });

        it('入力に誤りがあれば 422 で、何も変えない', function () {
            $recipe = Recipe::factory()->create(['name' => '元の名前']);

            $this->postJson("/api/recipes/{$recipe->id}", editInput(['name' => '']))
                ->assertUnprocessable()
                ->assertJsonValidationErrors('name');

            expect($recipe->refresh()->name)->toBe('元の名前');
        });

        it('ないレシピは 404', function () {
            $this->postJson('/api/recipes/999999', editInput())->assertNotFound();
        });
    });

    describe('削除', function () {
        it('204 を返し、材料・手順・タグとのつながり・作った記録も消す', function () {
            $recipe = Recipe::factory()->create();
            Ingredient::factory()->for($recipe)->create();
            Step::factory()->for($recipe)->create();
            CookingLog::factory()->for($recipe)->create();
            $recipe->tags()->attach(Tag::factory()->create());

            $this->deleteJson("/api/recipes/{$recipe->id}")->assertNoContent();

            $this->assertDatabaseCount('recipes', 0);
            $this->assertDatabaseCount('ingredients', 0);
            $this->assertDatabaseCount('steps', 0);
            $this->assertDatabaseCount('cooking_logs', 0);
            $this->assertDatabaseCount('recipe_tag', 0);
        });

        it('使われなくなったタグは消し、ほかのレシピが使うタグは残す', function () {
            $shared = Tag::factory()->create(['name' => '共有']);
            $alone = Tag::factory()->create(['name' => '単独']);
            $recipe = Recipe::factory()->create();
            $recipe->tags()->attach([$shared->id, $alone->id]);
            Recipe::factory()->create()->tags()->attach($shared);

            $this->deleteJson("/api/recipes/{$recipe->id}")->assertNoContent();

            $this->assertDatabaseMissing('tags', ['name' => '単独']);
            $this->assertDatabaseHas('tags', ['name' => '共有']);
            $this->assertDatabaseCount('recipes', 1);
        });

        it('ないレシピは 404', function () {
            $this->deleteJson('/api/recipes/999999')->assertNotFound();
        });
    });

    describe('複製', function () {
        it('料理名に（コピー）を付け、内容を同じ順番でコピーする', function () {
            $recipe = Recipe::factory()->create([
                'name' => '肉じゃが',
                'name_kana' => 'にくじゃが',
                'servings' => 3,
                'cook_minutes' => 30,
                'memo' => 'メモ',
            ]);
            $recipe->ingredients()->create(['position' => 1, 'name' => '塩', 'quantity' => '少々']);
            $recipe->ingredients()->create(['position' => 2, 'name' => '芋', 'quantity' => null]);
            $recipe->steps()->create(['position' => 1, 'body' => '切る']);
            $recipe->steps()->create(['position' => 2, 'body' => '煮る']);
            $recipe->tags()->attach(Tag::factory()->create(['name' => '和食']));

            $response = $this->postJson("/api/recipes/{$recipe->id}/copy")
                ->assertCreated()
                ->assertJsonPath('name', '肉じゃが（コピー）')
                ->assertJsonPath('name_kana', 'にくじゃが')
                ->assertJsonPath('category.id', $recipe->category_id)
                ->assertJsonPath('servings', 3)
                ->assertJsonPath('cook_minutes', 30)
                ->assertJsonPath('memo', 'メモ')
                ->assertJsonPath('tags.0.name', '和食');

            expect($response->json('id'))->not->toBe($recipe->id)
                ->and($response->json('ingredients'))->toBe([
                    ['name' => '塩', 'quantity' => '少々'],
                    ['name' => '芋', 'quantity' => null],
                ])
                ->and($response->json('steps'))->toBe([['body' => '切る'], ['body' => '煮る']]);
            // 元のレシピはそのまま
            expect($recipe->refresh()->name)->toBe('肉じゃが')
                ->and($recipe->ingredients()->count())->toBe(2);
        });

        it('お気に入りと作った記録はコピーしない', function () {
            $recipe = Recipe::factory()->create(['is_favorite' => true]);
            CookingLog::factory()->for($recipe)->create();

            $this->postJson("/api/recipes/{$recipe->id}/copy")
                ->assertCreated()
                ->assertJsonPath('is_favorite', false)
                ->assertJsonPath('cooking.count', 0);

            expect($recipe->refresh()->is_favorite)->toBeTrue();
            $this->assertDatabaseCount('cooking_logs', 1);
        });

        it('100文字を超えるときは、料理名の後ろを削ってから付ける', function (int $length, int $kept) {
            $recipe = Recipe::factory()->create(['name' => str_repeat('あ', $length)]);

            $this->postJson("/api/recipes/{$recipe->id}/copy")
                ->assertCreated()
                ->assertJsonPath('name', str_repeat('あ', $kept).'（コピー）');
        })->with([
            'ちょうど100文字になる' => [95, 95],
            '1文字超える' => [96, 95],
            '100文字の料理名' => [100, 95],
        ]);

        it('ないレシピは 404', function () {
            $this->postJson('/api/recipes/999999/copy')->assertNotFound();
        });
    });
});
