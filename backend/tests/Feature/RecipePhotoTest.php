<?php

use App\Actions\SaveRecipeAction;
use App\Models\Category;
use App\Models\Recipe;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;

// レシピの完成写真（F-21〜23、詳細設計書 4.6）

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function photoInput(array $overrides = []): array
{
    return array_replace([
        'name' => '肉じゃが',
        'category_id' => Category::query()->value('id') ?? Category::factory()->create()->id,
        'servings' => 2,
        'ingredients' => [['name' => '芋']],
        'steps' => [['body' => '煮る']],
    ], $overrides);
}

function largePath(string $name): string
{
    return 'recipes/large/'.$name;
}

function thumbPath(string $name): string
{
    return 'recipes/thumb/'.$name;
}

/**
 * @return array{0: int, 1: int, 2: string}
 */
function storedImageInfo(string $path): array
{
    $info = getimagesizefromstring((string) Storage::get($path));

    return [$info[0], $info[1], $info['mime']];
}

// 向きの情報（EXIF の Orientation）を入れた JPEG を作る
function jpegWithOrientation(int $width, int $height, int $orientation): UploadedFile
{
    $image = imagecreatetruecolor($width, $height);
    ob_start();
    imagejpeg($image);
    $jpeg = (string) ob_get_clean();

    $tiff = "II*\0".pack('V', 8).pack('v', 1)
        .pack('vvVvv', 0x0112, 3, 1, $orientation, 0)
        .pack('V', 0);
    $exif = "Exif\0\0".$tiff;
    $segment = "\xFF\xE1".pack('n', strlen($exif) + 2).$exif;

    $path = tempnam(sys_get_temp_dir(), 'photo');
    file_put_contents($path, substr($jpeg, 0, 2).$segment.substr($jpeg, 2));

    return new UploadedFile($path, 'phone.jpg', 'image/jpeg', null, true);
}

// 本物のアップロードと同じく、種類を中身で判断するファイルを作る（偽物は名前で判断する）
function uploadedText(string $name, string $contents): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'photo');
    file_put_contents($path, $contents);

    return new UploadedFile($path, $name, 'image/jpeg', null, true);
}

// 中身は小さいが、見出しの上では巨大な PNG を作る（getimagesize は見出しだけを読む）
function pngClaimingSize(int $width, int $height): UploadedFile
{
    $header = "\x89PNG\r\n\x1a\n".pack('N', 13).'IHDR'.pack('NN', $width, $height)."\x08\x06\0\0\0";
    $path = tempnam(sys_get_temp_dir(), 'photo');
    file_put_contents($path, $header.pack('N', 0).str_repeat("\0", 32));

    return new UploadedFile($path, 'huge.png', 'image/png', null, true);
}

beforeEach(function () {
    Storage::fake();
    $this->actingAs(User::factory()->create());
});

describe('登録', function () {
    it('詳細用と一覧用の2枚を WebP で保存し、URL を返す', function () {
        $response = $this->post('/api/recipes', photoInput([
            'photo' => UploadedFile::fake()->image('dish.png', 1600, 1200),
        ]), ['Accept' => 'application/json'])->assertCreated();

        $name = Recipe::query()->value('photo_path');

        expect($name)->toMatch('/^[0-9A-Za-z]{26}\.webp$/')
            ->and(storedImageInfo(largePath($name)))->toBe([1200, 900, 'image/webp'])
            ->and(storedImageInfo(thumbPath($name)))->toBe([400, 300, 'image/webp'])
            ->and($response->json('photo_url'))->toContain(largePath($name))
            ->and($response->json('thumb_url'))->toContain(thumbPath($name));
    });

    it('元が小さければ大きくしない', function () {
        $this->post('/api/recipes', photoInput([
            'photo' => UploadedFile::fake()->image('small.jpg', 300, 200),
        ]), ['Accept' => 'application/json'])->assertCreated();

        $name = Recipe::query()->value('photo_path');

        expect(storedImageInfo(largePath($name)))->toBe([300, 200, 'image/webp'])
            ->and(storedImageInfo(thumbPath($name)))->toBe([300, 200, 'image/webp']);
    });

    it('スマホの写真の向きに合わせて回し、EXIF の情報は残さない', function () {
        $this->post('/api/recipes', photoInput([
            'photo' => jpegWithOrientation(200, 100, 6),
        ]), ['Accept' => 'application/json'])->assertCreated();

        $name = Recipe::query()->value('photo_path');

        expect(storedImageInfo(largePath($name)))->toBe([100, 200, 'image/webp'])
            ->and(Storage::get(largePath($name)))->not->toContain('Exif');
    });

    it('写真がなければ URL は空', function () {
        $this->postJson('/api/recipes', photoInput())
            ->assertCreated()
            ->assertJsonPath('photo_url', null)
            ->assertJsonPath('thumb_url', null);

        expect(Storage::allFiles())->toBe([]);
    });

    it('5MB まで受け付ける', function () {
        $file = UploadedFile::fake()->image('dish.png', 10, 10)->size(5120);

        $this->post('/api/recipes', photoInput(['photo' => $file]), ['Accept' => 'application/json'])
            ->assertCreated();
    });

    it('受け付けないファイルは 422 で、何も保存しない', function (Closure $makeFile, string $message) {
        $this->post('/api/recipes', photoInput(['photo' => $makeFile()]), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.photo.0', $message);

        $this->assertDatabaseCount('recipes', 0);
        expect(Storage::allFiles())->toBe([]);
    })->with([
        '5MB を超える' => [
            fn () => UploadedFile::fake()->image('big.png', 10, 10)->size(5121),
            '写真は5MBまでにしてください',
        ],
        '画像でない' => [
            fn () => UploadedFile::fake()->create('note.pdf', 10, 'application/pdf'),
            '写真は JPEG・PNG・WebP のどれかにしてください',
        ],
        '名前だけ画像で、中身は文字' => [
            fn () => uploadedText('fake.jpg', '<?php echo 1;'),
            '写真は JPEG・PNG・WebP のどれかにしてください',
        ],
        'GIF' => [
            fn () => UploadedFile::fake()->image('anime.gif', 10, 10),
            '写真は JPEG・PNG・WebP のどれかにしてください',
        ],
        '画素数が多すぎる' => [
            fn () => pngClaimingSize(8000, 8000),
            '写真の画素数が多すぎます。別の写真を選んでください',
        ],
        '形は画像だが、中身が壊れている' => [
            fn () => pngClaimingSize(100, 100),
            '写真を読み込めませんでした。別の写真を選んでください',
        ],
    ]);

    it('写真の保存のあとに DB で失敗したら、保存した写真も消す', function () {
        Event::listen('eloquent.saving: '.Recipe::class, function () {
            throw new RuntimeException('DB の失敗');
        });

        expect(fn () => app(SaveRecipeAction::class)->execute(null, photoInput([
            'photo' => UploadedFile::fake()->image('dish.png', 10, 10),
        ])))->toThrow(RuntimeException::class, 'DB の失敗');

        expect(Storage::allFiles())->toBe([]);
    });
});

describe('編集', function () {
    beforeEach(function () {
        $this->post('/api/recipes', photoInput([
            'photo' => UploadedFile::fake()->image('dish.png', 500, 400),
        ]), ['Accept' => 'application/json'])->assertCreated();

        $this->recipe = Recipe::query()->firstOrFail();
        $this->oldName = $this->recipe->photo_path;
    });

    it('写真を送らなければ、今の写真のまま', function () {
        $this->post("/api/recipes/{$this->recipe->id}", photoInput(['_method' => 'PUT']), ['Accept' => 'application/json'])
            ->assertOk();

        expect($this->recipe->refresh()->photo_path)->toBe($this->oldName);
        Storage::assertExists(largePath($this->oldName));
    });

    it('差し替えると新しい名前で保存し、古い2枚を消す', function () {
        $this->post("/api/recipes/{$this->recipe->id}", photoInput([
            '_method' => 'PUT',
            'photo' => UploadedFile::fake()->image('new.png', 500, 400),
        ]), ['Accept' => 'application/json'])->assertOk();

        $newName = $this->recipe->refresh()->photo_path;

        expect($newName)->not->toBe($this->oldName);
        Storage::assertExists([largePath($newName), thumbPath($newName)]);
        Storage::assertMissing([largePath($this->oldName), thumbPath($this->oldName)]);
    });

    it('remove_photo で写真を消す', function () {
        $this->post("/api/recipes/{$this->recipe->id}", photoInput([
            '_method' => 'PUT',
            'remove_photo' => '1',
        ]), ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('photo_url', null);

        expect($this->recipe->refresh()->photo_path)->toBeNull()
            ->and(Storage::allFiles())->toBe([]);
    });

    it('写真と remove_photo を両方送ると、差し替えになる', function () {
        $this->post("/api/recipes/{$this->recipe->id}", photoInput([
            '_method' => 'PUT',
            'remove_photo' => '1',
            'photo' => UploadedFile::fake()->image('new.png', 500, 400),
        ]), ['Accept' => 'application/json'])->assertOk();

        $newName = $this->recipe->refresh()->photo_path;

        expect($newName)->not->toBeNull()->not->toBe($this->oldName);
        Storage::assertExists(largePath($newName));
        Storage::assertMissing(largePath($this->oldName));
    });

    it('DB で失敗したら、新しい写真を消して、古い写真は残す', function () {
        Event::listen('eloquent.saving: '.Recipe::class, function () {
            throw new RuntimeException('DB の失敗');
        });

        expect(fn () => app(SaveRecipeAction::class)->execute($this->recipe, photoInput([
            'photo' => UploadedFile::fake()->image('new.png', 10, 10),
        ])))->toThrow(RuntimeException::class, 'DB の失敗');

        expect(Storage::allFiles())->toEqualCanonicalizing([largePath($this->oldName), thumbPath($this->oldName)]);
    });

    it('入力に誤りがあれば、古い写真も新しい写真もそのまま', function () {
        $this->post("/api/recipes/{$this->recipe->id}", photoInput([
            '_method' => 'PUT',
            'name' => '',
            'photo' => UploadedFile::fake()->image('new.png', 10, 10),
        ]), ['Accept' => 'application/json'])->assertUnprocessable();

        expect(Storage::allFiles())->toEqualCanonicalizing([largePath($this->oldName), thumbPath($this->oldName)]);
    });

    it('レシピを消すと、写真の2枚も消す', function () {
        $this->deleteJson("/api/recipes/{$this->recipe->id}")->assertNoContent();

        expect(Storage::allFiles())->toBe([]);
    });

    it('複製すると2枚を新しい名前でコピーし、元を消しても残る', function () {
        $copyId = $this->postJson("/api/recipes/{$this->recipe->id}/copy")
            ->assertCreated()
            ->json('id');
        $copyName = Recipe::findOrFail($copyId)->photo_path;

        expect($copyName)->not->toBeNull()->not->toBe($this->oldName);
        Storage::assertExists([largePath($copyName), thumbPath($copyName)]);

        $this->deleteJson("/api/recipes/{$this->recipe->id}")->assertNoContent();

        Storage::assertExists([largePath($copyName), thumbPath($copyName)]);
        Storage::assertMissing(largePath($this->oldName));
    });

    it('元の写真が見つからなくても、写真なしで複製する', function () {
        Storage::delete(largePath($this->oldName));

        $this->postJson("/api/recipes/{$this->recipe->id}/copy")
            ->assertCreated()
            ->assertJsonPath('photo_url', null);
    });

    it('一覧は一覧用の写真の URL を返す', function () {
        $this->getJson('/api/recipes')
            ->assertOk()
            ->assertJsonPath('data.0.thumb_url', fn (string $url) => str_contains($url, thumbPath($this->oldName)));
    });
});

it('写真の URL は署名つきで、期限内だけ見られる', function () {
    // 偽の Storage では署名の URL を作らないので、本物の local を使う
    Storage::forgetDisk('local');
    $path = 'recipes/thumb/signature-test.webp';
    Storage::disk('local')->put($path, 'x');

    try {
        $url = Storage::disk('local')->temporaryUrl($path, now()->addMinutes(60));

        $this->get($url)->assertOk();
        $this->get(strtok($url, '?'))->assertForbidden();

        $this->travel(61)->minutes();
        $this->get($url)->assertForbidden();
    } finally {
        Storage::disk('local')->delete($path);
    }
});
