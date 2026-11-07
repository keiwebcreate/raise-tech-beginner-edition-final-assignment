<?php

// 入力の誤りの文言（詳細設計書 4.8）。使う決まりと項目名を、機能を作るときに足していく
return [
    'array' => ':attributeの形が正しくありません',
    'between' => [
        'numeric' => ':attributeは:minから:maxまでにしてください',
    ],
    'boolean' => ':attributeの値が正しくありません',
    'confirmed' => ':attributeが確認用と一致しません',
    'email' => ':attributeの形が正しくありません',
    'exists' => ':attributeが正しくありません',
    'integer' => ':attributeは整数で入力してください',
    'max' => [
        'array' => ':attributeは:max個までにしてください',
        'string' => ':attributeは:max文字までにしてください',
    ],
    'min' => [
        'array' => ':attributeは:min個以上にしてください',
        'string' => ':attributeは:min文字以上にしてください',
    ],
    'regex' => ':attributeの形が正しくありません',
    'required' => ':attributeを入力してください',
    'string' => ':attributeは文字で入力してください',

    'custom' => [
        'category_id' => [
            'required' => 'カテゴリを選んでください',
        ],
        'name_kana' => [
            'regex' => 'よみがなはひらがなで入力してください',
        ],
        'ingredients' => [
            'max' => '材料は:max行までにしてください',
            'min' => '材料は:min行以上にしてください',
        ],
        'steps' => [
            'max' => '作り方は:max行までにしてください',
            'min' => '作り方は:min行以上にしてください',
        ],
    ],

    'attributes' => [
        'email' => 'メールアドレス',
        'password' => 'パスワード',
        'name' => '料理名',
        'name_kana' => 'よみがな',
        'category_id' => 'カテゴリ',
        'servings' => '何人分',
        'cook_minutes' => '調理時間',
        'memo' => 'メモ',
        'tags' => 'タグ',
        'tags.*' => 'タグ',
        'ingredients' => '材料',
        'ingredients.*.name' => '材料名',
        'ingredients.*.quantity' => '分量',
        'steps' => '作り方',
        'steps.*.body' => '手順',
    ],
];
