<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// レシピ（テーブル設計書 3.3）
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recipes', function (Blueprint $table) {
            $table->id();
            // 使っているレシピがあるカテゴリは消せない（5章）
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('name', 100);
            $table->string('name_kana', 100)->nullable();
            $table->unsignedTinyInteger('servings');
            $table->unsignedSmallInteger('cook_minutes')->nullable();
            $table->text('memo')->nullable();
            $table->string('photo_path')->nullable();
            $table->boolean('is_favorite')->default(false);
            $table->timestamps();

            // 並び替えと絞り込みを速くする（4章）
            $table->index('created_at');
            $table->index('cook_minutes');
            $table->index('is_favorite');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recipes');
    }
};
