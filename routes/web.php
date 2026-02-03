<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('periods/{period}', function (string $period) {
    return Inertia::render('period', [
        'periodId' => $period,
    ]);
})->middleware(['auth', 'verified'])->name('periods.show');

Route::get('periods/{period}/daily', function (string $period) {
    return Inertia::render('period-daily', [
        'periodId' => $period,
    ]);
})->middleware(['auth', 'verified'])->name('periods.daily');

require __DIR__.'/settings.php';
