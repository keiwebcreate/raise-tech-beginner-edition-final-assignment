<?php

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\Exceptions\DecoderException;
use Intervention\Image\ImageManager;
use RuntimeException;

// 写真の縮小・保存・削除・コピー（詳細設計書 4.6）。
// DB には photo_path（ファイル名）だけを持ち、同じ名前で2枚を別のフォルダに置く
class RecipePhotoStorage
{
    private const LARGE_DIRECTORY = 'recipes/large';

    private const THUMB_DIRECTORY = 'recipes/thumb';

    private const LARGE_WIDTH = 1200;

    private const THUMB_WIDTH = 400;

    private const WEBP_QUALITY = 80;

    private const URL_MINUTES = 60;

    // SaveRecipeRequest の画素数の上限（5000万画素）を gd で開くのに足りる量
    private const MEMORY_LIMIT = '384M';

    /**
     * 2枚を作って保存し、ファイル名を返す。読み取れない画像は入力の誤りにする
     */
    public function store(UploadedFile $file): string
    {
        ini_set('memory_limit', self::MEMORY_LIMIT);

        // スマホの写真の向き（EXIF）に合わせて回し、位置情報などの情報は消す
        $manager = ImageManager::usingDriver(Driver::class, autoOrientation: true, decodeAnimation: false, strip: true);

        try {
            $image = $manager->decodePath((string) $file->getRealPath());
        } catch (DecoderException) {
            throw ValidationException::withMessages(['photo' => '写真を読み込めませんでした。別の写真を選んでください']);
        }

        $name = Str::ulid().'.webp';
        $encoder = new WebpEncoder(quality: self::WEBP_QUALITY);

        try {
            $this->put(self::LARGE_DIRECTORY, $name, $image->scaleDown(width: self::LARGE_WIDTH)->encode($encoder)->toString());
            $this->put(self::THUMB_DIRECTORY, $name, $image->scaleDown(width: self::THUMB_WIDTH)->encode($encoder)->toString());
        } catch (RuntimeException $exception) {
            $this->delete($name);

            throw $exception;
        }

        return $name;
    }

    public function delete(string $name): void
    {
        $this->disk()->delete([self::LARGE_DIRECTORY.'/'.$name, self::THUMB_DIRECTORY.'/'.$name]);
    }

    /**
     * 2枚を新しい名前でコピーし、ファイル名を返す。元の写真がなければ null
     */
    public function copy(string $name): ?string
    {
        $newName = Str::ulid().'.webp';

        foreach ([self::LARGE_DIRECTORY, self::THUMB_DIRECTORY] as $directory) {
            if (! $this->disk()->copy($directory.'/'.$name, $directory.'/'.$newName)) {
                $this->delete($newName);

                return null;
            }
        }

        return $newName;
    }

    public function largeUrl(?string $name): ?string
    {
        return $this->url(self::LARGE_DIRECTORY, $name);
    }

    public function thumbUrl(?string $name): ?string
    {
        return $this->url(self::THUMB_DIRECTORY, $name);
    }

    private function url(string $directory, ?string $name): ?string
    {
        if ($name === null) {
            return null;
        }

        return $this->disk()->temporaryUrl($directory.'/'.$name, now()->addMinutes(self::URL_MINUTES));
    }

    private function put(string $directory, string $name, string $contents): void
    {
        if (! $this->disk()->put($directory.'/'.$name, $contents)) {
            throw new RuntimeException('写真を保存できませんでした');
        }
    }

    /**
     * @return Filesystem&FilesystemAdapter
     */
    private function disk(): FilesystemAdapter
    {
        // 開発は local、本番は s3（FILESYSTEM_DISK で切り替える）
        return Storage::disk();
    }
}
