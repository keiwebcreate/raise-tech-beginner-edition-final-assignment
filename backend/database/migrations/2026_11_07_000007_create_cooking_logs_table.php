<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// 作った記録（テーブル設計書 3.8）
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cooking_logs', function (Blueprint $table) {
            $table->id();
            // レシピを消すと一緒に消える（5章）
            $table->foreignId('recipe_id')->constrained()->cascadeOnDelete();
            $table->date('cooked_on');
            $table->string('note', 200)->nullable();
            $table->timestamps();

            // 最後に作った日・回数を数える、記録を新しい順に出す（4章）
            $table->index(['recipe_id', 'cooked_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cooking_logs');
    }
};
