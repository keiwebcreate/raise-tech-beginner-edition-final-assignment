<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

// 持ち主のアカウントを作る（要件 F-54、詳細設計書 4.4）。アカウントは1つだけ
class CreateOwnerCommand extends Command
{
    protected $signature = 'app:create-owner';

    protected $description = '持ち主のアカウントを作る（1つだけ）';

    public function handle(): int
    {
        if (User::exists()) {
            $this->error('持ち主のアカウントはすでにあります。');

            return self::FAILURE;
        }

        $input = [
            'email' => $this->ask('メールアドレス'),
            // 画面に出さずに入力してもらう
            'password' => $this->secret('パスワード（8文字以上）'),
            'password_confirmation' => $this->secret('パスワード（もう一度）'),
        ];

        $validator = Validator::make($input, [
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        // パスワードは User モデルの設定でハッシュにして保存される（N-22）
        User::create([
            'name' => 'Owner',
            'email' => $input['email'],
            'password' => $input['password'],
        ]);

        $this->info('持ち主のアカウントを作りました。');

        return self::SUCCESS;
    }
}
