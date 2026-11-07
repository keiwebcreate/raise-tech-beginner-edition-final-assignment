<?php

use App\Models\CookingLog;
use App\Models\Recipe;
use App\Models\User;
use Illuminate\Support\Carbon;

// 作った記録（A-16〜A-18）

describe('ログインしていないとき', function () {
    it('401 を返し、何も変えない', function () {
        $log = CookingLog::factory()->create();

        $this->getJson("/api/recipes/{$log->recipe_id}/cooking-logs")->assertUnauthorized();
        $this->postJson("/api/recipes/{$log->recipe_id}/cooking-logs", ['cooked_on' => '2026-01-01'])->assertUnauthorized();
        $this->deleteJson("/api/cooking-logs/{$log->id}")->assertUnauthorized();

        $this->assertDatabaseCount('cooking_logs', 1);
    });
});

describe('ログインしているとき', function () {
    beforeEach(function () {
        $this->actingAs(User::factory()->create());
        $this->recipe = Recipe::factory()->create();
    });

    describe('一覧', function () {
        it('新しい順で返し、同じ日は作った順の逆にする。ほかのレシピの記録は出さない', function () {
            $old = CookingLog::factory()->for($this->recipe)->create(['cooked_on' => '2026-10-01', 'note' => '古い']);
            $first = CookingLog::factory()->for($this->recipe)->create(['cooked_on' => '2026-11-03', 'note' => '先']);
            $second = CookingLog::factory()->for($this->recipe)->create(['cooked_on' => '2026-11-03', 'note' => null]);
            CookingLog::factory()->create();

            $this->getJson("/api/recipes/{$this->recipe->id}/cooking-logs")
                ->assertOk()
                ->assertExactJson(['data' => [
                    ['id' => $second->id, 'cooked_on' => '2026-11-03', 'note' => null],
                    ['id' => $first->id, 'cooked_on' => '2026-11-03', 'note' => '先'],
                    ['id' => $old->id, 'cooked_on' => '2026-10-01', 'note' => '古い'],
                ]]);
        });

        it('ページ分けはせず、全部返す', function () {
            CookingLog::factory()->for($this->recipe)->count(25)->create();

            $this->getJson("/api/recipes/{$this->recipe->id}/cooking-logs")->assertJsonCount(25, 'data');
        });

        it('ないレシピは 404', function () {
            $this->getJson('/api/recipes/999999/cooking-logs')->assertNotFound();
        });
    });

    describe('追加', function () {
        it('201 と1件の形を返し、詳細の回数と最後に作った日に反映される', function () {
            $response = $this->postJson("/api/recipes/{$this->recipe->id}/cooking-logs", [
                'cooked_on' => '2026-01-15',
                'note' => '塩を減らした',
            ])->assertCreated();

            $response->assertExactJson([
                'id' => $response->json('id'),
                'cooked_on' => '2026-01-15',
                'note' => '塩を減らした',
            ]);

            $this->getJson("/api/recipes/{$this->recipe->id}")
                ->assertJsonPath('cooking.count', 1)
                ->assertJsonPath('cooking.last_cooked_on', '2026-01-15')
                ->assertJsonPath('cooking.recent_logs.0.note', '塩を減らした');
        });

        it('メモはなくてもよい', function () {
            $this->postJson("/api/recipes/{$this->recipe->id}/cooking-logs", ['cooked_on' => '2026-01-15'])
                ->assertCreated()
                ->assertJsonPath('note', null);
        });

        it('今日までは受け付け、明日からは断る。今日は日本時間で判定する', function () {
            // 世界標準時の 11/7 15:30 は、日本時間の 11/8 0:30
            Carbon::setTestNow(Carbon::parse('2026-11-07 15:30:00', 'UTC'));

            $this->postJson("/api/recipes/{$this->recipe->id}/cooking-logs", ['cooked_on' => '2026-11-08'])
                ->assertCreated();

            $this->postJson("/api/recipes/{$this->recipe->id}/cooking-logs", ['cooked_on' => '2026-11-09'])
                ->assertUnprocessable()
                ->assertJsonPath('errors.cooked_on.0', '作った日に未来の日付は選べません');

            $this->assertDatabaseCount('cooking_logs', 1);
        });

        it('決まりに合わない値は 422 で、保存しない', function (array $input, string $key, string $message) {
            $this->postJson("/api/recipes/{$this->recipe->id}/cooking-logs", $input)
                ->assertUnprocessable()
                ->assertJsonPath("errors.{$key}.0", $message);

            $this->assertDatabaseCount('cooking_logs', 0);
        })->with([
            '日付なし' => [[], 'cooked_on', '作った日を選んでください'],
            '日付の形が違う' => [['cooked_on' => '2026/01/15'], 'cooked_on', '作った日の形が正しくありません'],
            'ない日付' => [['cooked_on' => '2026-02-30'], 'cooked_on', '作った日の形が正しくありません'],
            'メモが長い' => [
                ['cooked_on' => '2026-01-15', 'note' => str_repeat('あ', 201)],
                'note',
                'ひとことメモは200文字までにしてください',
            ],
        ]);

        it('メモは200文字まで受け付ける', function () {
            $this->postJson("/api/recipes/{$this->recipe->id}/cooking-logs", [
                'cooked_on' => '2026-01-15',
                'note' => str_repeat('あ', 200),
            ])->assertCreated();
        });

        it('ないレシピは 404', function () {
            $this->postJson('/api/recipes/999999/cooking-logs', ['cooked_on' => '2026-01-15'])->assertNotFound();
        });
    });

    describe('削除', function () {
        it('204 を返し、その記録だけを消す', function () {
            $log = CookingLog::factory()->for($this->recipe)->create();
            $other = CookingLog::factory()->for($this->recipe)->create();

            $this->deleteJson("/api/cooking-logs/{$log->id}")->assertNoContent();

            $this->assertDatabaseMissing('cooking_logs', ['id' => $log->id]);
            $this->assertDatabaseHas('cooking_logs', ['id' => $other->id]);
        });

        it('ない記録は 404', function () {
            $this->deleteJson('/api/cooking-logs/999999')->assertNotFound();
        });
    });

    it('一覧の「最後に作った日」と並び替えに反映される', function () {
        $this->recipe->update(['name' => '今日作った']);
        $other = Recipe::factory()->create(['name' => '作っていない']);

        $this->postJson("/api/recipes/{$this->recipe->id}/cooking-logs", ['cooked_on' => '2026-01-15'])->assertCreated();

        $data = $this->getJson('/api/recipes?sort=last_cooked')->assertOk()->json('data');

        expect(array_column($data, 'name'))->toBe(['作っていない', '今日作った'])
            ->and($data[1]['last_cooked_on'])->toBe('2026-01-15')
            ->and($other->id)->toBe($data[0]['id']);
    });
});
