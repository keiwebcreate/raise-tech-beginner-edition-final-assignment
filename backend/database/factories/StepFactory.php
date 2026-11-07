<?php

namespace Database\Factories;

use App\Models\Recipe;
use App\Models\Step;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Step>
 */
class StepFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'recipe_id' => Recipe::factory(),
            'position' => fake()->unique()->numberBetween(1, 60000),
            'body' => '手順の文章',
        ];
    }
}
