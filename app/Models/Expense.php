<?php

namespace App\Models;

use App\Enums\ExpenseType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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
        return $this->belongsToMany(Period::class)
            ->withPivot(['planned_amount', 'actual_amount'])
            ->withTimestamps();
    }
}
