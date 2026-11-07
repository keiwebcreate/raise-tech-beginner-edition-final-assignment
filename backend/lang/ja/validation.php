<?php

// 入力の誤りの文言（詳細設計書 4.8）。使う決まりと項目名を、機能を作るときに足していく
return [
    'boolean' => ':attributeの値が正しくありません',
    'confirmed' => ':attributeが確認用と一致しません',
    'email' => ':attributeの形が正しくありません',
    'max' => [
        'string' => ':attributeは:max文字までにしてください',
    ],
    'min' => [
        'string' => ':attributeは:min文字以上にしてください',
    ],
    'required' => ':attributeを入力してください',
    'string' => ':attributeは文字で入力してください',

    'attributes' => [
        'email' => 'メールアドレス',
        'password' => 'パスワード',
    ],
];
