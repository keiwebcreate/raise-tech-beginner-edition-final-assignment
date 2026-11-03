<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
| Feature のテストは Laravel の TestCase の上で動かし、毎回 DB を作り直す
| （テスト用の DB recipe_app_test を使う。phpunit.xml）
*/
pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');
