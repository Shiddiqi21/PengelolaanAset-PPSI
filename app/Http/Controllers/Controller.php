<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

abstract class Controller
{
    // Dibutuhkan agar $this->authorize() di controller turunan berfungsi (Laravel 11+ tidak memasangnya otomatis).
    use AuthorizesRequests;
}
