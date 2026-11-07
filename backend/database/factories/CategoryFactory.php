<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'カテゴリ'.fake()->unique()->numberBetween(1, 200),
            // シーダーの 1〜12 と重ならない番号にする
            'sort_order' => fake()->unique()->numberBetween(13, 255),
        ];
    }
}
