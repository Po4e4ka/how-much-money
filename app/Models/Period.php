<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property Carbon|null $start_date
 * @property Carbon|null $end_date
 * @property array|null $daily_expenses
 * @property bool $is_pinned
 * @property bool $is_closed
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read Collection<int, Expense> $expenses
 * @property-read Pivot|null $pivot
 * @property-read int|null $pivot_planned_amount
 * @property-read int|null $pivot_actual_amount
 */
class Period extends Model
{
    protected $fillable = [
        'user_id',
        'start_date',
        'end_date',
        'daily_expenses',
        'is_pinned',
        'is_closed',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'daily_expenses' => 'array',
        'is_pinned' => 'boolean',
        'is_closed' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function expenses(): BelongsToMany
    {
        return $this->belongsToMany(Expense::class, 'period_expense')
            ->withPivot(['planned_amount', 'actual_amount'])
            ->withTimestamps();
    }
}
