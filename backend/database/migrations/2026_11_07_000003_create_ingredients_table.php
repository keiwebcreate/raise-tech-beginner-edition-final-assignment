<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// 材料（テーブル設計書 3.4）。保存のたびに入れ直すので、日時の列は持たない
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ingredients', function (Blueprint $table) {
            $table->id();
            // レシピを消すと一緒に消える（5章）
            $table->foreignId('recipe_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->string('name', 50);
            $table->string('quantity', 30)->nullable();

            $table->unique(['recipe_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ingredients');
    }
};
