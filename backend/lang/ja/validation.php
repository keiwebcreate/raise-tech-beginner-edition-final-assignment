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
        'cooked_on' => [
            'required' => '作った日を選んでください',
            'date_format' => '作った日の形が正しくありません',
            'before_or_equal' => '作った日に未来の日付は選べません',
        ],
        'photo' => [
            'file' => '写真を送れませんでした。もう一度選んでください',
            'uploaded' => '写真を送れませんでした。もう一度選んでください',
            'mimes' => '写真は JPEG・PNG・WebP のどれかにしてください',
            'max' => '写真は5MBまでにしてください',
        ],
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
        'note' => 'ひとことメモ',
        'photo' => '写真',
        'remove_photo' => '写真の削除',
        'tags' => 'タグ',
        'tags.*' => 'タグ',
        'ingredients' => '材料',
        'ingredients.*.name' => '材料名',
        'ingredients.*.quantity' => '分量',
        'steps' => '作り方',
        'steps.*.body' => '手順',
    ],
];
