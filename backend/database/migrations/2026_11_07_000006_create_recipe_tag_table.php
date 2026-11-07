<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// レシピとタグのつながり（テーブル設計書 3.7）
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recipe_tag', function (Blueprint $table) {
            // レシピやタグを消すと、つながりも消える（5章）
            $table->foreignId('recipe_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();

            // 同じタグを2回付けられない
            $table->primary(['recipe_id', 'tag_id']);
            // タグで絞り込むとき用。主キーは recipe_id が先なので、逆向きを足す（4章）
            $table->index('tag_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recipe_tag');
    }
};
