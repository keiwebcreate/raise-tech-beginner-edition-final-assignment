<?php

use App\Models\Category;
use App\Models\CookingLog;
use App\Models\Ingredient;
use App\Models\Recipe;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// レシピ一覧とお気に入り（A-08・A-13・A-14）

/**
 * @param  array<string, mixed>  $query
 * @return array<int, string>
 */
function listedNames($test, array $query = []): array
{
    return collect($test->getJson('/api/recipes?'.http_build_query($query))->assertOk()->json('data'))
        ->pluck('name')
        ->all();
}

describe('ログインしていないとき', function () {
    it('401 を返し、お気に入りも変えない', function () {
        $recipe = Recipe::factory()->create(['is_favorite' => false]);

        $this->getJson('/api/recipes')->assertUnauthorized();
        $this->putJson("/api/recipes/{$recipe->id}/favorite")->assertUnauthorized();
        $this->deleteJson("/api/recipes/{$recipe->id}/favorite")->assertUnauthorized();

        expect($recipe->refresh()->is_favorite)->toBeFalse();
    });
});

describe('ログインしているとき', function () {
    beforeEach(function () {
        $this->actingAs(User::factory()->create());
    });

    it('API 設計書の形で返す', function () {
        $recipe = Recipe::factory()->create([
            'name' => '肉じゃが',
            'cook_minutes' => 30,
            'is_favorite' => true,
        ]);
        $recipe->tags()->attach(Tag::factory()->create(['name' => '和食']));
        CookingLog::factory()->for($recipe)->create(['cooked_on' => '2026-10-01']);
        CookingLog::factory()->for($recipe)->create(['cooked_on' => '2026-11-03']);

        $response = $this->getJson('/api/recipes')->assertOk();

        expect(array_keys($response->json('data.0')))->toBe([
            'id', 'name', 'category', 'cook_minutes', 'tags', 'is_favorite', 'thumb_url', 'last_cooked_on',
        ]);
        $response->assertJsonPath('data.0.name', '肉じゃが')
            ->assertJsonPath('data.0.category.id', $recipe->category_id)
            ->assertJsonPath('data.0.tags.0.name', '和食')
            ->assertJsonPath('data.0.is_favorite', true)
            ->assertJsonPath('data.0.last_cooked_on', '2026-11-03')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.per_page', 20);
    });

    it('何件あっても、問い合わせの回数は増えない', function () {
        Recipe::factory()->count(2)->hasAttached(Tag::factory())->create();
        DB::enableQueryLog();
        $this->getJson('/api/recipes')->assertOk();
        $few = count(DB::getQueryLog());

        Recipe::factory()->count(10)->hasAttached(Tag::factory())->create();
        DB::flushQueryLog();
        $this->getJson('/api/recipes')->assertOk();

        expect(count(DB::getQueryLog()))->toBe($few);
    });

    describe('キーワード検索', function () {
        it('料理名・よみがな・材料名の部分一致で探す', function () {
            Recipe::factory()->create(['name' => '豚の生姜焼き', 'name_kana' => null]);
            Recipe::factory()->create(['name' => '筑前煮', 'name_kana' => 'ちくぜんに']);
            Ingredient::factory()->for(Recipe::factory()->create(['name' => 'カレー']))->create(['name' => '豚こま肉']);
            Recipe::factory()->create(['name' => 'サラダ', 'name_kana' => null]);

            expect(listedNames($this, ['q' => '豚']))->toEqualCanonicalizing(['豚の生姜焼き', 'カレー'])
                ->and(listedNames($this, ['q' => 'くぜん']))->toBe(['筑前煮']);
        });

        it('材料が何個合っても、レシピは1件だけ出す', function () {
            $recipe = Recipe::factory()->create(['name' => '豚汁']);
            Ingredient::factory()->for($recipe)->count(2)->create(['name' => '豚肉']);

            expect(listedNames($this, ['q' => '豚肉']))->toBe(['豚汁']);
        });

        it('表記の違いを区別しない', function (string $saved, string $keyword) {
            Recipe::factory()->create(['name' => $saved, 'name_kana' => null]);

            expect(listedNames($this, ['q' => $keyword]))->toBe([$saved]);
        })->with([
            'ひらがなとカタカナ' => ['トマト煮', 'とまと'],
            'カタカナとひらがな' => ['とまと煮', 'トマト'],
            '半角カタカナ' => ['トマト煮', 'ﾄﾏﾄ'],
            '全角の英数字' => ['Pizza 2', 'ｐｉｚｚａ　２'],
            '大文字と小文字' => ['TOMATO', 'tomato'],
        ]);

        it('濁点の違いは別の文字として扱う', function () {
            Recipe::factory()->create(['name' => 'ばし', 'name_kana' => null]);

            expect(listedNames($this, ['q' => 'はし']))->toBe([]);
        });

        it('% と _ と \ は、ただの文字として探す', function (string $keyword, string $expected) {
            Recipe::factory()->create(['name' => '塩分50%カット', 'name_kana' => null]);
            Recipe::factory()->create(['name' => 'a_b', 'name_kana' => null]);
            Recipe::factory()->create(['name' => 'c\\d', 'name_kana' => null]);
            Recipe::factory()->create(['name' => 'axb', 'name_kana' => null]);

            expect(listedNames($this, ['q' => $keyword]))->toBe([$expected]);
        })->with([
            ['%', '塩分50%カット'],
            ['_', 'a_b'],
            ['\\', 'c\\d'],
        ]);

        it('空白だけのキーワードは、条件なしと同じ', function () {
            Recipe::factory()->create();

            expect(listedNames($this, ['q' => '　 ']))->toHaveCount(1);
        });
    });

    describe('絞り込み', function () {
        it('カテゴリで絞る', function () {
            $category = Category::factory()->create();
            Recipe::factory()->create(['name' => '対象', 'category_id' => $category->id]);
            Recipe::factory()->create(['name' => '別']);

            expect(listedNames($this, ['category_id' => $category->id]))->toBe(['対象']);
        });

        it('タグで絞る', function () {
            $tag = Tag::factory()->create();
            Recipe::factory()->hasAttached($tag)->create(['name' => '対象']);
            Recipe::factory()->hasAttached(Tag::factory())->create(['name' => '別']);

            expect(listedNames($this, ['tag_id' => $tag->id]))->toBe(['対象']);
        });

        it('消えたタグやカテゴリは、エラーにせず0件にする', function () {
            Recipe::factory()->create();

            expect(listedNames($this, ['tag_id' => 999999]))->toBe([])
                ->and(listedNames($this, ['category_id' => 999999]))->toBe([]);
        });

        it('お気に入りだけに絞る', function () {
            Recipe::factory()->create(['name' => '対象', 'is_favorite' => true]);
            Recipe::factory()->create(['name' => '別', 'is_favorite' => false]);

            expect(listedNames($this, ['favorite' => 1]))->toBe(['対象']);
        });

        it('調理時間で絞り、時間が空のものは入れない', function () {
            Recipe::factory()->create(['name' => 'ちょうど', 'cook_minutes' => 15]);
            Recipe::factory()->create(['name' => '超える', 'cook_minutes' => 16]);
            Recipe::factory()->create(['name' => '空', 'cook_minutes' => null]);

            expect(listedNames($this, ['max_minutes' => 15]))->toBe(['ちょうど']);
        });

        it('条件は AND でつなぐ', function () {
            $category = Category::factory()->create();
            Recipe::factory()->create(['name' => '対象', 'category_id' => $category->id, 'is_favorite' => true]);
            Recipe::factory()->create(['name' => 'カテゴリだけ', 'category_id' => $category->id, 'is_favorite' => false]);
            Recipe::factory()->create(['name' => 'お気に入りだけ', 'is_favorite' => true]);

            expect(listedNames($this, ['category_id' => $category->id, 'favorite' => 1]))->toBe(['対象']);
        });
    });

    describe('並び替え', function () {
        it('初期値は登録日時の新しい順で、同じなら ID の大きい順', function () {
            Recipe::factory()->create(['name' => '古い', 'created_at' => '2026-01-01 00:00:00']);
            Recipe::factory()->create(['name' => '同時1', 'created_at' => '2026-02-01 00:00:00']);
            Recipe::factory()->create(['name' => '同時2', 'created_at' => '2026-02-01 00:00:00']);

            expect(listedNames($this))->toBe(['同時2', '同時1', '古い'])
                ->and(listedNames($this, ['sort' => 'newest']))->toBe(['同時2', '同時1', '古い']);
        });

        it('料理名順は、よみがながあればよみがな、なければ料理名で並べ、同じなら ID の小さい順', function () {
            Recipe::factory()->create(['name' => '筑前煮', 'name_kana' => 'ちくぜんに']);
            Recipe::factory()->create(['name' => 'さば', 'name_kana' => null]);
            Recipe::factory()->create(['name' => '赤飯', 'name_kana' => 'せきはん']);
            Recipe::factory()->create(['name' => 'あじ1', 'name_kana' => 'あじ']);
            Recipe::factory()->create(['name' => 'あじ2', 'name_kana' => 'あじ']);

            expect(listedNames($this, ['sort' => 'name']))->toBe(['あじ1', 'あじ2', 'さば', '赤飯', '筑前煮']);
        });

        it('調理時間の短い順で、空は最後、同じなら新しい順', function () {
            Recipe::factory()->create(['name' => '空', 'cook_minutes' => null]);
            Recipe::factory()->create(['name' => '30分', 'cook_minutes' => 30]);
            Recipe::factory()->create(['name' => '10分古い', 'cook_minutes' => 10, 'created_at' => '2026-01-01 00:00:00']);
            Recipe::factory()->create(['name' => '10分新しい', 'cook_minutes' => 10, 'created_at' => '2026-02-01 00:00:00']);

            expect(listedNames($this, ['sort' => 'cook_minutes']))->toBe(['10分新しい', '10分古い', '30分', '空']);
        });

        it('最後に作った日の古い順で、一度も作っていないものが最初、同じなら新しい順', function () {
            $old = Recipe::factory()->create(['name' => '先月']);
            CookingLog::factory()->for($old)->create(['cooked_on' => '2026-10-01']);
            // 古い記録があっても、最後に作った日で比べる
            $recent = Recipe::factory()->create(['name' => '今月']);
            CookingLog::factory()->for($recent)->create(['cooked_on' => '2026-01-01']);
            CookingLog::factory()->for($recent)->create(['cooked_on' => '2026-11-01']);
            Recipe::factory()->create(['name' => '未作成古い', 'created_at' => '2026-01-01 00:00:00']);
            Recipe::factory()->create(['name' => '未作成新しい', 'created_at' => '2026-02-01 00:00:00']);

            expect(listedNames($this, ['sort' => 'last_cooked']))->toBe(['未作成新しい', '未作成古い', '先月', '今月']);
        });
    });

    describe('ページ分け', function () {
        it('20件ずつ返し、件数の情報を付ける', function () {
            Recipe::factory()->count(24)->create();

            $this->getJson('/api/recipes')
                ->assertJsonCount(20, 'data')
                ->assertJsonPath('meta.current_page', 1)
                ->assertJsonPath('meta.last_page', 2)
                ->assertJsonPath('meta.total', 24)
                ->assertJsonPath('meta.from', 1)
                ->assertJsonPath('meta.to', 20);

            $this->getJson('/api/recipes?page=2')
                ->assertJsonCount(4, 'data')
                ->assertJsonPath('meta.from', 21)
                ->assertJsonPath('meta.to', 24);
        });

        it('条件はページを移っても保つ', function () {
            Recipe::factory()->count(21)->create(['is_favorite' => true]);
            Recipe::factory()->count(5)->create(['is_favorite' => false]);

            $this->getJson('/api/recipes?favorite=1&page=2')
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('meta.total', 21);
        });
    });

    it('決まりに合わない条件は 422', function (string $key, mixed $value) {
        $this->getJson('/api/recipes?'.http_build_query([$key => $value]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors($key);
    })->with([
        ['q', str_repeat('あ', 101)],
        ['q', ['配列']],
        ['category_id', 'abc'],
        ['tag_id', 0],
        ['favorite', 2],
        ['max_minutes', 20],
        ['sort', 'abc'],
        ['page', 0],
        ['page', 'abc'],
        ['page', 1000001],
    ]);

    describe('お気に入り', function () {
        it('付ける・外す。何度呼んでも同じ結果になる', function () {
            $recipe = Recipe::factory()->create(['is_favorite' => false]);

            foreach ([1, 2] as $_) {
                $this->putJson("/api/recipes/{$recipe->id}/favorite")
                    ->assertOk()
                    ->assertExactJson(['is_favorite' => true]);
                expect($recipe->refresh()->is_favorite)->toBeTrue();
            }

            foreach ([1, 2] as $_) {
                $this->deleteJson("/api/recipes/{$recipe->id}/favorite")
                    ->assertOk()
                    ->assertExactJson(['is_favorite' => false]);
                expect($recipe->refresh()->is_favorite)->toBeFalse();
            }
        });

        it('ないレシピは 404', function () {
            $this->putJson('/api/recipes/999999/favorite')->assertNotFound();
            $this->deleteJson('/api/recipes/999999/favorite')->assertNotFound();
        });
    });
});
