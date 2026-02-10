<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\PeriodController;
use App\Http\Controllers\UserInfoController;
use App\Http\Controllers\ViewerController;
use App\Models\User;
use App\Models\Viewer;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('onboarding', function () {
    return Inertia::render('onboarding');
})->name('onboarding');

Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('sharing', function () {
    return Inertia::render('sharing');
})->middleware(['auth', 'verified'])->name('sharing');

Route::get('shared/{user}', function (\Illuminate\Http\Request $request, User $user) {
    $hasAccess = Viewer::query()
        ->where('user_id', $user->id)
        ->where('viewer_id', $request->user()->id)
        ->where('status', Viewer::STATUS_ACTIVE)
        ->exists();

    if (!$hasAccess) {
        abort(403);
    }

    return Inertia::render('dashboard', [
        'viewerId' => $user->id,
        'viewerName' => $user->name,
        'viewerEmail' => $user->email,
        'viewerMode' => true,
    ]);
})->middleware(['auth', 'verified'])->name('shared.dashboard');

Route::get('shared/{user}/periods/{period}', function (\Illuminate\Http\Request $request, User $user, string $period) {
    $hasAccess = Viewer::query()
        ->where('user_id', $user->id)
        ->where('viewer_id', $request->user()->id)
        ->where('status', Viewer::STATUS_ACTIVE)
        ->exists();

    if (!$hasAccess) {
        abort(403);
    }

    return Inertia::render('period', [
        'periodId' => $period,
        'viewerId' => $user->id,
        'viewerName' => $user->name,
        'viewerEmail' => $user->email,
        'viewerMode' => true,
    ]);
})->middleware(['auth', 'verified'])->name('shared.periods.show');

Route::get('shared/{user}/periods/{period}/daily', function (\Illuminate\Http\Request $request, User $user, string $period) {
    $hasAccess = Viewer::query()
        ->where('user_id', $user->id)
        ->where('viewer_id', $request->user()->id)
        ->where('status', Viewer::STATUS_ACTIVE)
        ->exists();

    if (!$hasAccess) {
        abort(403);
    }

    return Inertia::render('period-daily', [
        'periodId' => $period,
        'viewerId' => $user->id,
        'viewerName' => $user->name,
        'viewerEmail' => $user->email,
        'viewerMode' => true,
    ]);
})->middleware(['auth', 'verified'])->name('shared.periods.daily');

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
        Route::post('periods/{period}/pin', [PeriodController::class, 'pin'])
            ->name('api.periods.pin');
        Route::post('periods/{period}/close', [PeriodController::class, 'close'])
            ->name('api.periods.close');
        Route::get('periods/{period}/expense-suggestions', [PeriodController::class, 'expenseSuggestions'])
            ->name('api.periods.expense-suggestions');
        Route::put('periods/{period}', [PeriodController::class, 'update'])
            ->name('api.periods.update');
        Route::delete('periods/{period}', [PeriodController::class, 'destroy'])
            ->name('api.periods.destroy');
        Route::get('viewers', [ViewerController::class, 'index'])
            ->name('api.viewers.index');
        Route::get('viewers/shared-with-me', [ViewerController::class, 'sharedWithMe'])
            ->name('api.viewers.shared-with-me');
        Route::post('viewers', [ViewerController::class, 'store'])
            ->name('api.viewers.store');
        Route::patch('viewers/{viewer}', [ViewerController::class, 'update'])
            ->name('api.viewers.update');
        Route::delete('viewers/{viewer}', [ViewerController::class, 'destroy'])
            ->name('api.viewers.destroy');
        Route::post('user/info-shown', [UserInfoController::class, 'markShown'])
            ->name('api.user.info-shown');
    });

require __DIR__.'/settings.php';
