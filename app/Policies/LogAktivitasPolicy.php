<?php

namespace App\Policies;

use App\Models\User;

class LogAktivitasPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isOperator();
    }
}
