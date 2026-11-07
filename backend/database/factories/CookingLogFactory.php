<?php

namespace Database\Factories;

use App\Models\CookingLog;
use App\Models\Recipe;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CookingLog>
 */
class CookingLogFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'recipe_id' => Recipe::factory(),
            'cooked_on' => fake()->date(),
        ];
    }
}
