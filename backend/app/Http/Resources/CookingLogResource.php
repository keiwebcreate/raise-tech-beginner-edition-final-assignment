<?php

namespace App\Http\Resources;

use App\Models\CookingLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CookingLog
 */
class CookingLogResource extends JsonResource
{
    // 1件のときは data で包まない（API 設計書 A-17）
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cooked_on' => $this->cooked_on->format('Y-m-d'),
            'note' => $this->note,
        ];
    }
}
