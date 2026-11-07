<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

// 固定のカテゴリ12個（要件定義書 4.1）。変えるときはここを直す
class CategorySeeder extends Seeder
{
    private const NAMES = [
        '主菜',
        '副菜',
        'サラダ',
        '汁物・スープ',
        'ご飯もの',
        '麺類',
        'パン・粉もの',
        'お弁当・おつまみ',
        'デザート・おやつ',
        '飲み物',
        'たれ・ソース・調味料',
        'その他',
    ];

    public function run(): void
    {
        foreach (self::NAMES as $index => $name) {
            // 並び順で探して、あれば更新、なければ作る。何度動かしても増えない
            Category::updateOrCreate(['sort_order' => $index + 1], ['name' => $name]);
        }
    }
}
