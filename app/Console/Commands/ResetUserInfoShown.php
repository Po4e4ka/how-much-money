<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class ResetUserInfoShown extends Command
{
    protected $signature = 'app:reset-user-info-shown';

    protected $description = 'Reset update-info modal flag for all users';

    public function handle()
    {
        $updated = User::query()->update(['is_info_shown' => false]);
        $this->info('Все пользователи снова увидят модалку');

        return self::SUCCESS;
    }
}
