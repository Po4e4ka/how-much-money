<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\PeriodController;

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

Route::middleware(['auth', 'verified', 'api'])
    ->prefix('api')
    ->group(function () {
        Route::get('periods', [PeriodController::class, 'index'])
            ->name('api.periods.index');
        Route::post('periods', [PeriodController::class, 'store'])
            ->name('api.periods.store');
        Route::get('periods/{period}', [PeriodController::class, 'show'])
            ->name('api.periods.show');
        Route::put('periods/{period}', [PeriodController::class, 'update'])
            ->name('api.periods.update');
        Route::delete('periods/{period}', [PeriodController::class, 'destroy'])
            ->name('api.periods.destroy');
    });

require __DIR__.'/settings.php';
