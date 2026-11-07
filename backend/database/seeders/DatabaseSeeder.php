<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    // 持ち主のアカウントはここでは作らない。コマンドで作る（要件 F-54）
    public function run(): void
    {
        $this->call(CategorySeeder::class);
    }
}
