<?php

namespace App\Support;

use Normalizer;

// 文字をそろえる（詳細設計書 4.3）。保存する前と検索のときに使う
class TextNormalizer
{
    /**
     * 全角の英数字・記号を半角に、半角カタカナを全角にし（NFKC）、
     * 前後の空白を取って、続く空白を1つにまとめる
     */
    public static function normalize(string $text): string
    {
        $normalized = Normalizer::normalize($text, Normalizer::FORM_KC);

        // 壊れた文字列のときは false が返る。そのまま次の入力チェックに任せる
        if ($normalized === false) {
            return $text;
        }

        return trim((string) preg_replace('/\s+/u', ' ', $normalized));
    }
}
