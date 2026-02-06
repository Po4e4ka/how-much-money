<?php

namespace App\Models;

use App\Enums\ExpenseType;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property ExpenseType $type
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Period> $periods
 * @property-read Pivot|null $pivot
 * @property-read int|null $pivot_planned_amount
 * @property-read int|null $pivot_actual_amount
 */
class Expense extends Model
{
    protected $fillable = [
        'name',
        'type',
    ];

    protected $casts = [
        'type' => ExpenseType::class,
    ];

    public function periods(): BelongsToMany
    {
        return $this->belongsToMany(Period::class, 'period_expense')
            ->withPivot(['planned_amount', 'actual_amount'])
            ->withTimestamps();
    }
}
