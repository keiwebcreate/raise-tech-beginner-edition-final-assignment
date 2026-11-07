<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Recipe;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Recipe>
 */
class RecipeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'name' => '料理'.fake()->unique()->numberBetween(1, 100000),
            'servings' => fake()->numberBetween(1, 99),
        ];
    }
}
